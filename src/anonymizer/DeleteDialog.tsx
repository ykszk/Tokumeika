import React, { useState } from 'react';
import { Dialog, Button } from '@material-ui/core';
import {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import Tooltip from '@material-ui/core/Tooltip';

export function DeleteDialog(props: {
  anonymous_id: string;
  onDeletion: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
  };
  const handleDelete = () => {
    fetch('/delete/' + props.anonymous_id, {
      method: 'DELETE',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          props.onDeletion();
          console.log('Deletion done');
        } else {
          console.log('Something went wrong with deletion!');
          console.log(data.result);
        }
      });
    setDialogOpen(false);
  };
  return (
    <React.Fragment>
      <Tooltip title={'Delete ' + props.anonymous_id}>
        <IconButton aria-label="delete" onClick={handleClick}>
          <DeleteIcon />
        </IconButton>
      </Tooltip>
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        aria-labelledby="delete-dialog"
        aria-describedby="confirm-deletion"
      >
        <DialogTitle id="delete-dialog-title">
          {'Deleting ' + props.anonymous_id}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete {props.anonymous_id}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            Cancel
          </Button>
          <Button onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
