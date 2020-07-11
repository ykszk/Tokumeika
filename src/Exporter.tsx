import React, { useState, useEffect } from 'react';
import { Typography } from '@material-ui/core';
import {
  Table,
  TableBody,
  TableHead,
  Chip,
  Tooltip,
  Box,
  Button,
  Checkbox,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { StyledTableCell, StyledTableRow } from './anonymizer/StyledTable';
import { EntryType } from './Browser';
interface PatientType {
  PatientID: string;
}

interface ItemType {
  id: string;
  name: string;
}

const useStyles = makeStyles((theme) => ({
  vspacing: {
    '& > *': {
      margin: theme.spacing(0.5),
    },
  },
}));

function need_export(e: EntryType) {
  if (!e.last_export) {
    return true;
  }
  const last_export = Date.parse(e.last_export);
  const last_update = Date.parse(e.last_update);
  return last_export < last_update;
}

export function Exporter() {
  const [data, setData] = useState(Array<EntryType>());
  const [metaNameMap, setMetaNameMap] = useState(new Map<string, string>());
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const classes = useStyles();

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

  useEffect(() => {
    fetch('rebuild_db').then(() => {
      fetch('query')
        .then((res) => res.json())
        .then((data) => {
          data.result.map((e: EntryType) => {
            e.meta.items = new Set(e.meta.items);
            return e;
          });
          setData(data.result);
        });
    });
  }, []);

  function onClick() {
    setButtonDisabled(true);
    function recursive_fetch(index: number) {
      if (index >= data.length) {
        setButtonDisabled(false);
        return;
      }
      const cb = document.getElementById(
        data[index].SeriesInstanceUID,
      ) as HTMLInputElement;
      if (!cb.checked) {
        recursive_fetch(index + 1);
        return;
      }
      const pid = data[index].anonymized.PatientID;
      const suid = data[index].SeriesInstanceUID;
      fetch(`/export/${pid}/${suid}`)
        .then((res) => res.json())
        .then((res_data) => {
          if (res_data.success) {
            data[index].last_export = res_data.data.last_export;
            setData(data.slice());
          } else {
            console.log('Something went wrong!');
            console.log(res_data.reason);
          }
          cb.click(); // uncheck the box
          recursive_fetch(index + 1);
        });
    }
    recursive_fetch(0);
  }

  const rows = data.map((e, data_index) => (
    <React.Fragment key={e.SeriesInstanceUID}>
      <StyledTableRow>
        <StyledTableCell title={e.SeriesInstanceUID}>
          {e.original.PatientID}
        </StyledTableCell>
        <StyledTableCell title={e.SeriesInstanceUID}>
          {e.anonymized.PatientID}
        </StyledTableCell>
        <StyledTableCell>{e.registration_datetime}</StyledTableCell>
        <StyledTableCell>
          {e.last_update === e.registration_datetime ? '' : e.last_update}
        </StyledTableCell>
        <StyledTableCell>{e.last_export ? e.last_export : ''}</StyledTableCell>
        <StyledTableCell>
          <div className={classes.vspacing}>
            {Array.from(e.meta.items).map((id) => {
              return (
                <Chip key={id} label={metaNameMap.get(id)} size="small"></Chip>
              );
            })}
            {e.meta.note === '' ? null : (
              <Tooltip title={<Typography>{e.meta.note}</Typography>}>
                <Chip variant="outlined" size="small" label="Note" />
              </Tooltip>
            )}
          </div>
        </StyledTableCell>
        <StyledTableCell>
          <Checkbox
            color="primary"
            title={`Export ${e.original.PatientID}`}
            id={e.SeriesInstanceUID}
            name={e.SeriesInstanceUID}
            defaultChecked={need_export(e)}
          />
        </StyledTableCell>
      </StyledTableRow>
    </React.Fragment>
  ));
  return (
    <Box className={classes.vspacing}>
      <Table size="small">
        <TableHead>
          <StyledTableRow>
            <StyledTableCell>Original Patient ID</StyledTableCell>
            <StyledTableCell>Anonymized Patient ID</StyledTableCell>
            <StyledTableCell>Registration</StyledTableCell>
            <StyledTableCell>Update</StyledTableCell>
            <StyledTableCell>Last Export</StyledTableCell>
            <StyledTableCell>Additional data</StyledTableCell>
            <StyledTableCell>Export</StyledTableCell>
          </StyledTableRow>
        </TableHead>
        <TableBody>{rows}</TableBody>
      </Table>
      <Button
        onClick={onClick}
        disabled={buttonDisabled}
        variant="contained"
        color="primary"
      >
        Export
      </Button>
    </Box>
  );
}
