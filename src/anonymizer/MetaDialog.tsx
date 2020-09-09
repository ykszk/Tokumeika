import React, { useState } from 'react';
import {
  Dialog,
  Button,
  FormControlLabel,
  Checkbox,
  Box,
  Table,
  TableBody,
  TableHead,
  TextField,
} from '@material-ui/core';
import { DialogTitle, DialogContent, DialogActions } from './CustomizedDialog';
import { StyledTableCell, StyledTableRow } from './StyledTable';
import { makeStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import EditIcon from '@material-ui/icons/Edit';
import Tooltip from '@material-ui/core/Tooltip';
import { MetaType } from './Dcm';

const useStyles = makeStyles((theme) => ({
  vspacing: {
    '& > *': {
      margin: theme.spacing(0.5),
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

export const suffix_fracture = '_fx';
export const suffix_surgery = '_sx';

export function MetaDialog(props: {
  title: string;
  handleData: (meta: MetaType) => void;
  iniMetaState: MetaType;
  metaNameMap: Map<string, string>;
}) {
  const { title, handleData, iniMetaState, metaNameMap } = props;
  const classes = useStyles();
  const [openDialog, setDialogOpen] = useState(false);

  const [meta, setMeta] = useState(cloneMetaData(iniMetaState));
  const [noneChecked, setNoneChecked] = useState(meta.items.size === 0);

  const handleClickOpen = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    setDialogOpen(true);
  };
  const handleClose = () => {
    setMeta(cloneMetaData(iniMetaState));
    setDialogOpen(false);
    setNoneChecked(iniMetaState.items.size === 0);
  };
  const handleOK = () => {
    setDialogOpen(false);
    handleData(meta);
  };
  const rows: JSX.Element[] = [];
  metaNameMap.forEach((name, id) => {
    const id_fx = id + suffix_fracture;
    const id_sx = id + suffix_surgery;
    rows.push(
      <React.Fragment key={id}>
        <StyledTableRow>
          <StyledTableCell>{name}</StyledTableCell>
          <StyledTableCell>
            <Checkbox
              checked={meta.items.has(id_fx)}
              id={id_fx}
              size="small"
              disabled={noneChecked}
              onChange={handleCheckbox}
            />
          </StyledTableCell>
          <StyledTableCell>
            <Checkbox
              checked={meta.items.has(id_sx)}
              id={id_sx}
              size="small"
              disabled={noneChecked || !meta.items.has(id_fx)}
              onChange={handleCheckbox}
            />
          </StyledTableCell>
        </StyledTableRow>
      </React.Fragment>,
    );
  });
  // Add unknown ids if there's any.
  meta.items.forEach((id) => {
    if (
      !metaNameMap.has(id) &&
      !id.endsWith(suffix_fracture) &&
      !id.endsWith(suffix_surgery)
    ) {
      rows.push(
        <React.Fragment key={id}>
          <StyledTableRow>
            <StyledTableCell>{`Unknown:${id}`}</StyledTableCell>
            <StyledTableCell></StyledTableCell>
            <StyledTableCell></StyledTableCell>
          </StyledTableRow>
        </React.Fragment>,
      );
    }
  });

  function onTextChange(event: React.ChangeEvent<HTMLInputElement>) {
    meta.note = event.target.value;
    setMeta(Object.assign({}, meta));
  }

  function handleCheckbox(event: React.ChangeEvent<HTMLInputElement>) {
    const id = event.currentTarget.id;
    if (meta.items.has(id)) {
      meta.items.delete(id);
      if (id.endsWith(suffix_fracture)) {
        // delete surgery
        const id_fx = id.substring(0, id.length - 3) + suffix_surgery;
        meta.items.delete(id_fx);
      }
    } else {
      meta.items.add(id);
    }
    setMeta(cloneMetaData(meta));
  }

  function handleNoneChange(
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) {
    if (checked) {
      meta.items = new Set<string>();
      setMeta(cloneMetaData(meta));
    }
    setNoneChecked(checked);
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
          <Box className={classes.vspacing}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={noneChecked}
                  onChange={handleNoneChange}
                  name="checkedNone"
                />
              }
              label="骨折なし"
            />
            <Table size="small" stickyHeader>
              <TableHead>
                <StyledTableRow>
                  <StyledTableCell>Part</StyledTableCell>
                  <StyledTableCell>Fracture</StyledTableCell>
                  <StyledTableCell>Surgery</StyledTableCell>
                </StyledTableRow>
              </TableHead>
              <TableBody>{rows}</TableBody>
            </Table>
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
          </Box>
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
