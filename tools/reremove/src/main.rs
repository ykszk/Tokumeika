use anyhow::{bail, Context, Result};
use clap::Parser;
use dicom::{
    core::Tag,
    object::{FileDicomObject, InMemDicomObject},
};
use env_logger::Env;
use indexmap::IndexSet;
use log::{debug, info, warn};
use regex::Regex;
use serde::Deserialize;
use std::path::PathBuf;
use std::{io::Write, path::MAIN_SEPARATOR_STR};

#[derive(Deserialize, Debug)]
struct TagString(String);

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct Tags {
    remove: Vec<TagString>,
    // replace: Vec<TagString>,
}

lazy_static::lazy_static! {
    static ref RE_TAG: Regex = Regex::new(r"([0-9A-Fa-f]{4}),([0-9A-Fa-f]{4})").unwrap();
}

lazy_static::lazy_static! {
    static ref TMP_SUFFIX: std::ffi::OsString = std::ffi::OsString::from(".tmp");
}

impl TagString {
    fn to_tag(&self) -> Result<Tag> {
        if let Some(cap) = RE_TAG.captures(&self.0) {
            let t1 = u16::from_str_radix(cap.get(1).unwrap().as_str(), 16)?;
            let t2 = u16::from_str_radix(cap.get(2).unwrap().as_str(), 16)?;
            Ok(Tag(t1, t2))
        } else {
            bail!("Invalid tag: {}", self.0);
        }
    }
}

#[derive(Default, Debug)]
struct Stats {
    removed: usize,
    total: usize,
}

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Input directory containing zip files.
    input: PathBuf,

    /// Config directory containing tags.toml. default: EXE/config
    #[arg(long)]
    config: Option<PathBuf>,

    /// Save updated dicom-zip files to the specified directory instead of overwriting existing files.
    #[arg(long)]
    output: Option<PathBuf>,
}

fn main() -> Result<()> {
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();
    let args = Cli::parse();

    if let Some(outdir) = &args.output {
        if !outdir.exists() {
            info!("Create output directory {:?}", outdir);
            std::fs::create_dir_all(outdir)?;
        }
    }

    let exe_path = std::env::current_exe()?;
    let exe_dir = exe_path
        .parent()
        .context("Failed to obtain exe's location")?;
    let exe_dir_str = exe_dir
        .to_str()
        .context("Failed to obtain exe's location")?;
    let config_dir = args.config.unwrap_or_else(|| exe_dir.join("config"));
    info!("Reading `tags.toml` from {:?}", config_dir);
    let tags_str = std::fs::read_to_string(config_dir.join("tags.toml"))?;
    let tags: Tags = toml::from_str(&tags_str)?;
    let removes: Vec<Tag> = tags
        .remove
        .iter()
        .map(|t| t.to_tag())
        .collect::<Result<Vec<_>>>()?;
    let zip_dir = args.input;
    info!("Remove tags from zip files in {:?}", zip_dir);
    let pattern = format!(
        "{0}{MAIN_SEPARATOR_STR}*{MAIN_SEPARATOR_STR}*.zip",
        zip_dir.to_string_lossy()
    );
    let mut stats = Stats::default();
    debug!("Glob pattern: {}", pattern);
    let mut all_removed_tags: IndexSet<Tag> = IndexSet::new();
    for entry in glob::glob(&pattern)? {
        let path = entry?;
        let disp_path = path.to_string_lossy().replace(exe_dir_str, "");
        info!("Scanning {} ...", disp_path);
        let file = std::fs::File::open(&path)?;
        let mut removed_tags: IndexSet<Tag> = IndexSet::new();
        let mut zip_contents: Vec<(String, FileDicomObject<InMemDicomObject>)> = Vec::new();
        {
            let mut archive = zip::ZipArchive::new(file)?;
            for i in 0..archive.len() {
                let file = archive.by_index(i)?;
                let name = file.name().to_string();
                let mut obj = dicom::object::from_reader(file)
                    .with_context(|| format!("Failed to read dicom file {}", name))?;
                for tag in removes.iter() {
                    if obj.remove_element(*tag) {
                        removed_tags.insert(*tag);
                    }
                }
                zip_contents.push((name, obj));
            }
        }
        stats.total += 1;
        if removed_tags.is_empty() {
            info!("No tags to remove found.");
        } else {
            stats.removed += 1;
            all_removed_tags.extend(removed_tags.iter());
            let removed_tags: String = removed_tags
                .iter()
                .map(|tag| tag.to_string())
                .collect::<Vec<String>>()
                .join(",");
            info!("Following tags have been removed: {}", removed_tags);
            info!("Saving updated zip file ...");
            let mut tmp_file_name = path.file_name().unwrap().to_owned();
            tmp_file_name.push(TMP_SUFFIX.as_os_str());
            let options = zip::write::FileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated)
                .unix_permissions(0o755);
            let tmp_zip_path = path.with_file_name(tmp_file_name);
            let mut zip = zip::ZipWriter::new(std::fs::File::create(&tmp_zip_path)?);
            for (name, obj) in zip_contents {
                zip.start_file(name, options)?;
                let mut bin: Vec<u8> = Vec::new();
                obj.write_all(&mut bin)?;
                zip.write_all(&bin)?;
            }
            if let Some(outdir) = &args.output {
                let path = outdir.join(path.file_name().unwrap());
                std::fs::rename(tmp_zip_path, path)?;
            } else {
                std::fs::rename(tmp_zip_path, path)?;
            }
        }
    }
    if stats.total == 0 {
        warn!("No zip file found in {:?}", zip_dir)
    } else {
        info!(
            "{} zip files scanned and {} zip files updated in {:?}.",
            stats.total, stats.removed, zip_dir
        );
        if !all_removed_tags.is_empty() {
            info!(
                "Removed tags are {}",
                all_removed_tags
                    .into_iter()
                    .map(|e| e.to_string())
                    .collect::<Vec<String>>()
                    .join(", ")
            );
        }
    }
    Ok(())
}
