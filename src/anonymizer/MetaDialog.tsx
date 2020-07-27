import React, { useState } from 'react';
import { Dialog, Button, Box, TextField } from '@material-ui/core';
import { DialogTitle, DialogContent, DialogActions } from './CustomizedDialog';
import { makeStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import EditIcon from '@material-ui/icons/Edit';
import Tooltip from '@material-ui/core/Tooltip';
import { MetaType } from './Dcm';

const useStyles = makeStyles((theme) => ({
  selected: {
    backgroundColor: theme.palette.secondary.main,
    '&:hover': {
      backgroundColor: theme.palette.secondary.dark,
    },
  },
  notSelected: {
    '&:hover': {
      backgroundColor: theme.palette.secondary.light,
    },
  },
  textarea: {
    resize: 'both',
  },
  spacing: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
}));

export function cloneMetaData(meta: MetaType) {
  return { items: new Set(meta.items), note: meta.note };
}

export function MetaDialog(props: {
  title: string;
  handleData: (meta: MetaType) => void;
  iniMetaState: MetaType;
  metaNameMap: Map<string, string>;
}) {
  let { title, handleData, iniMetaState, metaNameMap } = props;
  const classes = useStyles();
  const [openDialog, setDialogOpen] = useState(false);

  const [meta, setMeta] = useState(cloneMetaData(iniMetaState));

  const handleClickOpen = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    setDialogOpen(true);
  };
  const handleClose = () => {
    setMeta(cloneMetaData(iniMetaState));
    setDialogOpen(false);
  };
  const handleOK = () => {
    setDialogOpen(false);
    handleData(meta);
  };
  const buttons: JSX.Element[] = [];
  metaNameMap.forEach((name, id) => {
    buttons.push(
      <React.Fragment key={id}>
        <Button
          className={
            meta.items.has(id) ? classes.selected : classes.notSelected
          }
          onClick={handleToggleButton}
          variant="contained"
          id={id}
        >
          {name}
        </Button>
      </React.Fragment>,
    );
  });

  function handleToggleButton(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) {
    const id = event.currentTarget.id;
    if (meta.items.has(id)) {
      meta.items.delete(id);
    } else {
      meta.items.add(id);
    }
    setMeta(cloneMetaData(meta));
  }

  function onTextChange(event: React.ChangeEvent<HTMLInputElement>) {
    meta.note = event.target.value;
    setMeta(Object.assign({}, meta));
  }

  return (
    <React.Fragment>
      <Tooltip title="Edit data">
        <IconButton aria-label="edit" onClick={handleClickOpen}>
          <EditIcon />
        </IconButton>
      </Tooltip>
      <Dialog
        onClose={handleClose}
        aria-labelledby="filename-list-dialog-title"
        open={openDialog}
      >
        <DialogTitle id="dialog-title" onClose={handleClose}>
          {title}
        </DialogTitle>
        <DialogContent>
          <Box p={2} className={classes.spacing}>
            {buttons}
          </Box>
          <TextField
            label="Note"
            placeholder=""
            value={meta.note}
            multiline
            rows={3}
            fullWidth={true}
            variant="filled"
            onChange={onTextChange}
            inputProps={{ className: classes.textarea }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            autoFocus
            onClick={handleOK}
            variant="contained"
            color="primary"
            className={'buttonPadding'}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
