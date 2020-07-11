import React, { useState, useEffect } from 'react';
import { Box, Button, Chip, Tooltip, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Table, TableBody, TableHead } from '@material-ui/core';

import { StyledTableCell, StyledTableRow } from './StyledTable';

import { AnonymizerState } from './Anonymizer';
import * as Dcm from './Dcm';

const useStyles = makeStyles((theme) => ({
  spacing: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  vspacing: {
    '& > *': {
      marginTop: theme.spacing(0.5),
      marginBottom: theme.spacing(0.5),
    },
  },
}));

interface ItemType {
  id: string;
  name: string;
}

enum ExecState {
  WAIT,
  IN_PROGRESS,
  DONE,
  FAIL,
}

export function AnonExec(props: {
  dcmList: Dcm.Patients;
  handleNewState: React.Dispatch<React.SetStateAction<AnonymizerState>>;
}) {
  const classes = useStyles();

  const [, entries] = Dcm.flattenDcmList(props.dcmList);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [states, setStates] = useState(entries.map(() => ExecState.WAIT));

  function onClick() {
    setButtonDisabled(true);
    function recursive_fetch(index: number) {
      if (index >= entries.length) {
        return;
      }
      states[index] = ExecState.IN_PROGRESS;
      setStates(states.slice());
      const data = {
        filenames: entries[index].filenames,
        meta: {
          items: Array.from(entries[index].meta.items),
          note: entries[index].meta.note,
        },
      };
      fetch('/register', {
        method: 'PUT',
        mode: 'same-origin',
        cache: 'no-cache',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        redirect: 'follow',
        referrer: 'no-referrer',
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            states[index] = ExecState.DONE;
          } else {
            console.log('Something went wrong!');
            console.log(data.reason);
            states[index] = ExecState.FAIL;
          }
          setStates(states.slice());
          recursive_fetch(index + 1);
        });
    }
    recursive_fetch(0);
  }

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

  const table = (
    <Table size="small">
      <TableHead>
        <StyledTableRow>
          <StyledTableCell>PatientID</StyledTableCell>
          <StyledTableCell>StudyID / StudyInstanceUID</StyledTableCell>
          <StyledTableCell>SeriesNumber / SeriesInstanceUID</StyledTableCell>
          <StyledTableCell>Additional data</StyledTableCell>
          <StyledTableCell>Status</StyledTableCell>
        </StyledTableRow>
      </TableHead>
      <TableBody>
        {entries.map((entry, index) => {
          const selected = [] as string[];
          metaNameMap.forEach((name, id) => {
            if (entry.meta.items.has(id)) {
              selected.push(id);
            }
          });
          const note =
            entry.meta.note === '' ? null : (
              <Tooltip title={<Typography>{entry.meta.note}</Typography>}>
                <Chip variant="outlined" size="small" label="Note" />
              </Tooltip>
            );
          return (
            <React.Fragment key={'exec_' + entry.SeriesInstanceUID}>
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
                  {((state: ExecState) => {
                    switch (state) {
                      case ExecState.WAIT:
                        return <Typography>Waiting</Typography>;
                      case ExecState.IN_PROGRESS:
                        return <Typography>In progress</Typography>;
                      case ExecState.DONE:
                        return <Typography>Done</Typography>;
                      case ExecState.FAIL:
                        return <Typography>Failed</Typography>;
                      default:
                        return <Typography>?</Typography>;
                    }
                  })(states[index])}
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
      <Typography variant="subtitle1">Execute anonymization</Typography>
      {table}
      <Button
        disabled={buttonDisabled}
        variant="contained"
        color="primary"
        onClick={onClick}
      >
        Execute
      </Button>
    </Box>
  );
}
