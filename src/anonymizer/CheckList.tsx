import React, { useState } from 'react';
import { Dialog } from '@material-ui/core';
import { Table, TableBody, TableHead } from '@material-ui/core';
import { Box, Button, Checkbox, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { AnonymizerState, AnonymizerMain } from './Anonymizer';
import { StyledTableCell, StyledTableRow } from './StyledTable';
import { DialogTitle, DialogContent, DialogActions } from './CustomizedDialog';
import * as Dcm from './Dcm';

const useStyles = makeStyles((theme) => ({
  root: {
    '& > *': {
      marginTop: theme.spacing(0.5),
      marginBottom: theme.spacing(0.5),
    },
  },
}));

export function AnonCheckList(props: {
  dcmList: Dcm.Patients;
  handleNewState: React.Dispatch<React.SetStateAction<AnonymizerState>>;
}) {
  const classes = useStyles();

  function onProceedButtonClick() {
    const newList = props.dcmList.filter((patient) => {
      const updated = patient.studies.map((study) => {
        const filtered = study.serieses.filter((series) => {
          const cb = document.getElementById(
            series.SeriesInstanceUID,
          ) as HTMLInputElement;
          return cb.checked;
        });
        study.serieses = filtered;
        return study;
      });
      patient.studies = updated;
      return patient;
    });

    props.handleNewState({
      state: AnonymizerMain.CHECK_NAMES,
      dcmList: newList,
    });
  }

  const [openDialog, setDialogOpen] = useState(false);
  const [seriesUid, setSeriesUid] = useState('');

  const handleClickOpen = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    setSeriesUid(event.currentTarget.id);
    setDialogOpen(true);
  };
  const handleClose = () => {
    setDialogOpen(false);
  };

  const [seriesUid2entry, entries] = Dcm.flattenDcmList(props.dcmList);

  const dialog = (
    <div>
      <Dialog
        onClose={handleClose}
        aria-labelledby="filename-list-dialog-title"
        open={openDialog}
        fullWidth={true}
        maxWidth={false}
      >
        <DialogTitle id="dialog-title" onClose={handleClose}>
          Filenames for {seriesUid2entry.get(seriesUid)?.summary}
        </DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableBody>
              {seriesUid2entry.get(seriesUid)?.filenames.map((filename) => {
                return (
                  <StyledTableRow>
                    <StyledTableCell>{filename}</StyledTableCell>
                  </StyledTableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button
            autoFocus
            onClick={handleClose}
            variant="contained"
            color="primary"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );

  const table = (
    <Table size="small">
      <TableHead>
        <StyledTableRow>
          <StyledTableCell>Select</StyledTableCell>
          <StyledTableCell>PatientID</StyledTableCell>
          <StyledTableCell>StudyID / StudyInstanceUID</StyledTableCell>
          <StyledTableCell>SeriesNumber / SeriesInstanceUID</StyledTableCell>
          <StyledTableCell>Filenames</StyledTableCell>
        </StyledTableRow>
      </TableHead>
      <TableBody>
        {entries.map((entry) => {
          return (
            <React.Fragment key={'CL_' + entry.SeriesInstanceUID}>
              <StyledTableRow>
                <StyledTableCell>
                  <Checkbox
                    color="primary"
                    title={`Process ${entry.summary}`}
                    id={entry.SeriesInstanceUID}
                    defaultChecked
                  ></Checkbox>
                </StyledTableCell>
                <StyledTableCell>{entry.patient_desc}</StyledTableCell>
                <StyledTableCell>{entry.study_desc}</StyledTableCell>
                <StyledTableCell>{entry.series_desc}</StyledTableCell>
                <StyledTableCell>
                  <Button
                    variant="outlined"
                    id={entry.SeriesInstanceUID}
                    onClick={handleClickOpen}
                  >
                    View
                  </Button>
                </StyledTableCell>
              </StyledTableRow>
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
  return (
    <Box className={classes.root}>
      <Typography variant="subtitle1">(2/4) Select series</Typography>
      {dialog}
      {table}
      <Button variant="contained" onClick={onProceedButtonClick}>
        Proceed
      </Button>
    </Box>
  );
}
