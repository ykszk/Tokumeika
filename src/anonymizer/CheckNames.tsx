import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableHead } from '@material-ui/core';
import { Box, Button, Chip, Tooltip, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { AnonymizerState, AnonymizerMain } from './Anonymizer';
import { StyledTableCell, StyledTableRow } from './StyledTable';
import { MetaDialog, cloneMetaData } from './MetaDialog';
import * as Dcm from './Dcm';

type MetaType = Dcm.MetaType;

const useStyles = makeStyles((theme) => ({
  vspacing: {
    '& > *': {
      margin: theme.spacing(0.5),
    },
  },
  spacing: {
    display: 'flex',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    '& > *': {
      margin: theme.spacing(0.5),
    },
    alignItems: 'center',
  },
  selected: {
    backgroundColor: theme.palette.secondary.main,
    '&:hover:': {
      backgroundColor: 'yellow',
    },
  },
  notSelected: {
    '&:hover:': {
      backgroundColor: theme.palette.secondary.main,
    },
  },
}));

interface ItemType {
  id: string;
  name: string;
}

type MetaMapType = Map<string, MetaType>;

export function AnonCheckNames(props: {
  dcmList: Dcm.Patients;
  handleNewState: React.Dispatch<React.SetStateAction<AnonymizerState>>;
}) {
  function onButtonClick() {
    props.dcmList.forEach((patient) =>
      patient.studies.forEach((study) =>
        study.serieses.forEach((series) => {
          series.Meta = metaMap.get(series.SeriesInstanceUID)!;
        }),
      ),
    );
    props.handleNewState({
      state: AnonymizerMain.EXEC,
      dcmList: props.dcmList,
    });
  }
  const classes = useStyles();

  const [, entries] = Dcm.flattenDcmList(props.dcmList);

  const [metaMap, setMetaMap] = useState(
    new Map<string, MetaType>(
      entries.map((e) => {
        return [
          e.SeriesInstanceUID,
          { items: new Set<string>(), note: '' } as MetaType,
        ];
      }),
    ),
  ); // suid -> set of meta ids

  const [metaNameMap, setMetaNameMap] = useState(new Map<string, string>());

  useEffect(() => {
    fetch('itemlist')
      .then((res) => res.json())
      .then((data) => {
        setMetaNameMap(
          new Map<string, string>(
            data.items.map((e: ItemType) => [e.id, e.name]),
          ),
        );
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  function handleMetaData(suid: string, meta: MetaType) {
    metaMap.set(suid, cloneMetaData(meta));
    setMetaMap(new Map(metaMap));
  }

  const table = (
    <Table size="small">
      <TableHead>
        <StyledTableRow>
          <StyledTableCell>PatientID</StyledTableCell>
          <StyledTableCell>StudyID / StudyInstanceUID</StyledTableCell>
          <StyledTableCell>SeriesNumber / SeriesInstanceUID</StyledTableCell>
          <StyledTableCell>Additional data</StyledTableCell>
          <StyledTableCell>Edit</StyledTableCell>
        </StyledTableRow>
      </TableHead>
      <TableBody>
        {entries.map((entry) => {
          const selected = [] as string[];
          const meta = metaMap.get(entry.SeriesInstanceUID);
          if (meta === undefined) {
            return null;
          }
          metaNameMap.forEach((name, id) => {
            if (meta.items.has(id)) {
              selected.push(id);
            }
          });
          const note =
            meta.note === '' ? null : (
              <Tooltip title={<Typography>{meta.note}</Typography>}>
                <Chip variant="outlined" size="small" label="Note" />
              </Tooltip>
            );
          return (
            <React.Fragment key={'CN_' + entry.SeriesInstanceUID}>
              <StyledTableRow>
                <StyledTableCell>{entry.patient_desc}</StyledTableCell>
                <StyledTableCell>{entry.study_desc}</StyledTableCell>
                <StyledTableCell>{entry.series_desc}</StyledTableCell>
                <StyledTableCell>
                  <div className={classes.spacing}>
                    {selected.map((id) => {
                      return (
                        <Chip label={metaNameMap.get(id)} size="small"></Chip>
                      );
                    })}
                    {note}
                  </div>
                </StyledTableCell>
                <StyledTableCell>
                  <MetaDialog
                    title={'Edit ' + entry.summary}
                    handleData={(data) =>
                      handleMetaData(entry.SeriesInstanceUID, data)
                    }
                    iniMetaState={metaMap.get(entry.SeriesInstanceUID)!}
                    metaNameMap={metaNameMap}
                  />
                </StyledTableCell>
              </StyledTableRow>
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
  return (
    <Box className={classes.vspacing}>
      <Typography variant="subtitle1">(3/4) Edit meta data</Typography>
      {table}
      <Button variant="contained" onClick={onButtonClick}>
        Proceed
      </Button>
    </Box>
  );
}
