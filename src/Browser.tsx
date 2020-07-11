import React, { useState, useEffect } from 'react';
import { Typography } from '@material-ui/core';
import { Table, TableBody, TableHead, Chip, Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { StyledTableCell, StyledTableRow } from './anonymizer/StyledTable';
import { MetaType } from './anonymizer/Dcm';
import { MetaDialog } from './anonymizer/MetaDialog';

interface PatientType {
  PatientID: string;
}

export interface EntryType {
  original: PatientType;
  anonymized: PatientType;
  meta: MetaType;
  SeriesInstanceUID: string;
  age: string;
  registration_datetime: string;
  last_update: string;
  last_export?: string;
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

type DataType = EntryType[];

function eqSet<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const item of Array.from(a)) {
    if (!b.has(item)) return false;
  }
  return true;
}

export function Browser() {
  const [data, setData] = useState(Array<EntryType>());
  const [metaNameMap, setMetaNameMap] = useState(new Map<string, string>());
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

  function handleMetaData(data_index: number, meta: MetaType) {
    const prev = data[data_index].meta;
    if (prev.note === meta.note && eqSet(prev.items, meta.items)) {
      console.log('Meta data not changed.');
      return;
    }
    data[data_index].meta = meta;
    setData(data.slice());
    const pid = data[data_index].anonymized.PatientID;
    const suid = data[data_index].SeriesInstanceUID;
    const metaData = {
      items: Array.from(meta.items),
      note: meta.note,
    };
    fetch(`/update/${pid}/${suid}`, {
      method: 'PUT',
      mode: 'same-origin',
      cache: 'no-cache',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      redirect: 'follow',
      referrer: 'no-referrer',
      body: JSON.stringify(metaData),
    })
      .then((res) => res.json())
      .then((res_data) => {
        if (res_data.success) {
          data[data_index].last_update = res_data.data.last_update;
          setData(data.slice());
        } else {
          console.log('Something went wrong!');
          console.log(res_data.reason);
        }
      });
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
        <StyledTableCell>{e.age}</StyledTableCell>
        <StyledTableCell>{e.registration_datetime}</StyledTableCell>
        <StyledTableCell>
          {e.last_update === e.registration_datetime ? '' : e.last_update}
        </StyledTableCell>
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
          <MetaDialog
            title={'Edit ' + e.original.PatientID}
            handleData={(data) => handleMetaData(data_index, data)}
            iniMetaState={e.meta}
            metaNameMap={metaNameMap}
          />
        </StyledTableCell>
      </StyledTableRow>
    </React.Fragment>
  ));
  return (
    <Table size="small">
      <TableHead>
        <StyledTableRow>
          <StyledTableCell>Original Patient ID</StyledTableCell>
          <StyledTableCell>Anonymized Patient ID</StyledTableCell>
          <StyledTableCell>Age</StyledTableCell>
          <StyledTableCell>Registration</StyledTableCell>
          <StyledTableCell>Update</StyledTableCell>
          <StyledTableCell>Additional data</StyledTableCell>
          <StyledTableCell>Edit</StyledTableCell>
        </StyledTableRow>
      </TableHead>
      <TableBody>{rows}</TableBody>
    </Table>
  );
}
