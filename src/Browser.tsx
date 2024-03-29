import React, { useState, useEffect } from 'react';
import { Typography } from '@material-ui/core';
import {
  Table,
  TableBody,
  TableHead,
  Chip,
  Tooltip,
  Box,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { StyledTableCell, StyledTableRow } from './anonymizer/StyledTable';
import { MetaType } from './anonymizer/Dcm';
import {
  MetaDialog,
  cloneMetaData,
  suffix_fracture,
  suffix_surgery,
} from './anonymizer/MetaDialog';
import { DeleteDialog } from './anonymizer/DeleteDialog';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import { SortableType, Order, descendingComparator } from './SortableTable';

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

function eqSet<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const item of Array.from(a)) {
    if (!b.has(item)) return false;
  }
  return true;
}

const suffix_both = '_both';
const suffix_dummy = '_dummy';

export function metaItems2Chips(
  items: Set<string>,
  metaNameMap: Map<string, string>,
) {
  function id2name(id: string) {
    let prefix: string;
    let suffix: string;
    if (id.endsWith(suffix_both)) {
      prefix = id.substring(0, id.length - 5);
      suffix = ' (骨折・手術)';
    } else if (id.endsWith(suffix_fracture)) {
      prefix = id.substring(0, id.length - 3);
      suffix = ' (骨折)';
    } else {
      // ends with _sx
      prefix = id.substring(0, id.length - 3);
      suffix = ' (手術)';
    }
    return (
      (metaNameMap.get(prefix)
        ? metaNameMap.get(prefix)
        : `Unknown:${prefix}`) + suffix
    );
  }
  return Array.from(items)
    .map((id) => {
      if (id.endsWith(suffix_fracture)) {
        const prefix = id.substring(0, id.length - 3);
        if (items.has(prefix + suffix_surgery)) {
          return prefix + suffix_both; // both
        } else {
          return id; // fx only
        }
      } else {
        const prefix = id.substring(0, id.length - 3);
        if (items.has(prefix + suffix_fracture)) {
          return prefix + suffix_dummy;
        } else {
          return id;
        }
      }
    })
    .filter((id) => {
      return !id.endsWith(suffix_dummy);
    })
    .map((id) => {
      return <Chip key={id} label={id2name(id)} size="small"></Chip>;
    });
}

const sortables: SortableType<EntryType>[] = [
  {
    id: 'original_pid',
    label: 'Original Patient ID',
    comparator: (a, b) =>
      descendingComparator(a.original.PatientID, b.original.PatientID),
  },
  {
    id: 'anonymized_pid',
    label: 'Anonymized Patient ID',
    comparator: (a, b) =>
      descendingComparator(a.anonymized.PatientID, b.anonymized.PatientID),
  },
  {
    id: 'age',
    label: 'Age',
    comparator: (a, b) => descendingComparator(a.age, b.age),
  },
  {
    id: 'registration',
    label: 'Registration',
    comparator: (a, b) =>
      descendingComparator(
        Date.parse(a.registration_datetime),
        Date.parse(b.registration_datetime),
      ),
  },
  {
    id: 'update',
    label: 'Update',
    comparator: (a, b) =>
      descendingComparator(
        Date.parse(a.last_update),
        Date.parse(b.last_update),
      ),
  },
];

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

  function reflesh() {
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
  }

  useEffect(() => {
    reflesh();
  }, []);

  function handleMetaData(data_index: number, meta: MetaType) {
    const prev = data[data_index].meta;
    if (prev.note === meta.note && eqSet(prev.items, meta.items)) {
      console.log('Meta data not changed.');
      return;
    }
    data[data_index].meta = cloneMetaData(meta);
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

  const [sortBy, setSortBy] = useState('');
  const [order, setOrder] = React.useState<Order>('asc');

  const handleRequestSort = (sortable: SortableType<EntryType>) => {
    const id = sortable.id;
    const isAsc = sortBy === id && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setSortBy(id);
    if (isAsc) {
      data.sort((a, b) => sortable.comparator(a, b));
    } else {
      data.sort((a, b) => -sortable.comparator(a, b));
    }
    setData(data.slice());
  };
  function createSortHandler(sortable: SortableType<EntryType>) {
    return (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      return handleRequestSort(sortable);
    };
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
            {metaItems2Chips(e.meta.items, metaNameMap)}
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
        <StyledTableCell>
          <DeleteDialog
            anonymous_id={e.anonymized.PatientID}
            onDeletion={() => reflesh()}
          />
        </StyledTableCell>
      </StyledTableRow>
    </React.Fragment>
  ));
  const sortableHeaders = sortables.map((sortable) => {
    return (
      <StyledTableCell
        key={sortable.id}
        sortDirection={sortBy === sortable.id ? order : false}
      >
        <TableSortLabel
          active={sortBy === sortable.id}
          direction={sortBy === sortable.id ? order : 'asc'}
          onClick={createSortHandler(sortable)}
        >
          {sortable.label}
        </TableSortLabel>
      </StyledTableCell>
    );
  });
  return (
    <Box className={classes.vspacing}>
      <Table size="small">
        <TableHead>
          <StyledTableRow>
            {sortableHeaders}
            <StyledTableCell>Additional data</StyledTableCell>
            <StyledTableCell>Edit</StyledTableCell>
            <StyledTableCell>Delete</StyledTableCell>
          </StyledTableRow>
        </TableHead>
        <TableBody>{rows}</TableBody>
      </Table>
    </Box>
  );
}
