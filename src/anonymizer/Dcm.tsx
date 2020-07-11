export interface MetaType {
  items: Set<string>;
  note: string;
}

export interface Series {
  SeriesNumber: string;
  SeriesDescription: string;
  SeriesInstanceUID: string;
  Meta: MetaType;
  filenames: string[];
}

export interface Study {
  StudyInstanceUID: string;
  StudyID: string;
  serieses: Series[];
}

export interface Patient {
  PatientID: string;
  PatientName: string;
  studies: Study[];
}

export type Patients = Patient[];

export interface SeriesEntry {
  patient_desc: string;
  study_desc: string;
  series_desc: string;
  summary: string;
  meta: MetaType;
  SeriesInstanceUID: string;
  filenames: string[];
}

export function flattenDcmList(
  dcmList: Patients,
): [Map<string, SeriesEntry>, SeriesEntry[]] {
  const seriesUid2entry = new Map<string, SeriesEntry>();
  const flattened = dcmList.flatMap((patient) => {
    return patient.studies.flatMap((study) => {
      return study.serieses.map((series) => {
        const patient_desc = patient.PatientName;
        const study_desc = study.StudyID
          ? study.StudyID
          : study.StudyInstanceUID;
        const series_desc = series.SeriesNumber
          ? series.SeriesNumber
          : series.SeriesDescription
          ? series.SeriesDescription
          : series.SeriesInstanceUID;
        const summary = patient_desc + ' / ' + study_desc + ' / ' + series_desc;
        const entry: SeriesEntry = {
          patient_desc: patient_desc,
          study_desc: study_desc,
          series_desc: series_desc,
          summary: summary,
          meta: series.Meta,
          SeriesInstanceUID: series.SeriesInstanceUID,
          filenames: series.filenames,
        };
        seriesUid2entry.set(series.SeriesInstanceUID, entry);
        return entry;
      });
    });
  });
  return [seriesUid2entry, flattened];
}
