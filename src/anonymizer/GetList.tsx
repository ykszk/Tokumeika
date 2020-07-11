import React, { useState, useEffect } from 'react';
import { Button, Typography, Snackbar, IconButton } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';
import { makeStyles } from '@material-ui/core/styles';
import FolderIcon from '@material-ui/icons/Folder';

import { AnonymizerState, AnonymizerMain } from './Anonymizer';

const useStyles = makeStyles((theme) => ({
  root: {
    '& > *': {
      margin: theme.spacing(1),
    },
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  error: {
    backgroundColor: 'red',
    color: 'white',
  },
}));

export function AnonGetList(props: {
  handleNewState: React.Dispatch<React.SetStateAction<AnonymizerState>>;
}) {
  const classes = useStyles();
  const [snackOpen, setSnackOpen] = useState(false);
  const [errMessage, setErrMessage] = useState('');

  function get_list() {
    fetch('dcmlist?path=' + encodeURIComponent(dcmRoot))
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          setErrMessage(data.reason);
          setSnackOpen(true);
          return;
        }
        const result = data.result;
        if (result.length === 0) {
          setErrMessage(`No dicom file was found in "${dcmRoot}"`);
        } else {
          props.handleNewState({
            state: AnonymizerMain.CHECK_LIST,
            dcmList: result,
          });
          // console.log(data);
        }
      });
  }

  let openDirDialog = null;
  const w = window as any;
  if (w.electron) {
    // console.log("We are in electron!!!");
    openDirDialog = (
      <IconButton
        aria-label="open-directory-dialog"
        onClick={() => {
          w.electron.openDirectoryDialog((d: any) => {
            console.log(d);
            setDcmRoot(d);
          });
        }}
      >
        <FolderIcon />
      </IconButton>
    );
  }

  const [dcmRoot, setDcmRoot] = useState('');
  const [pathExists, setPathExists] = useState(false);

  useEffect(() => {
    if (dcmRoot === '') {
      setPathExists(false);
    } else {
      fetch('exists?path=' + encodeURIComponent(dcmRoot))
        .then((res) => res.json())
        .then((data) => setPathExists(data.exists && data.type === 'directory'))
        .catch((err) => {
          console.log(err);
        });
    }
  }, [dcmRoot]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setDcmRoot(event.target.value);
  }

  const handleSnackClose = () => {
    setSnackOpen(false);
  };

  return (
    <div>
      <Typography variant="subtitle1">Choose input DICOM directory</Typography>
      <form autoComplete="off" className={classes.root}>
        {openDirDialog}
        <TextField
          id="dcm_root"
          onChange={handleChange}
          value={dcmRoot}
          variant="filled"
          size="small"
          style={{ minWidth: '20em' }}
          label="Input DICOM directory"
        />
        <Button
          variant="contained"
          onClick={() => get_list()}
          disabled={!pathExists}
        >
          List DICOM
        </Button>
      </form>
      <Snackbar
        open={snackOpen}
        message={errMessage}
        onClose={handleSnackClose}
        anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
        ContentProps={{ classes: { root: classes.error } }}
      />
    </div>
  );
}
