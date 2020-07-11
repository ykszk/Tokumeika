import React, { useState } from 'react';
import { Typography } from '@material-ui/core';
import * as Dcm from './Dcm';
import { AnonCheckList } from './CheckList';
import { AnonCheckNames } from './CheckNames';
import { AnonGetList } from './GetList';
import { AnonExec } from './Execute';

export enum AnonymizerMain {
  GET_LIST,
  CHECK_LIST,
  CHECK_NAMES,
  EXEC,
}

export interface AnonymizerState {
  state: AnonymizerMain;
  dcmList: Dcm.Patients;
}

export function Anonymizer() {
  const [state, setState] = useState<AnonymizerState>({
    state: AnonymizerMain.GET_LIST,
    dcmList: [],
  });

  const default_component = <AnonGetList handleNewState={setState} />;

  let main: JSX.Element;
  switch (state.state) {
    case AnonymizerMain.GET_LIST:
      main = default_component;
      break;
    case AnonymizerMain.CHECK_LIST:
      main = (
        <AnonCheckList dcmList={state.dcmList} handleNewState={setState} />
      );
      break;
    case AnonymizerMain.CHECK_NAMES:
      main = (
        <AnonCheckNames dcmList={state.dcmList} handleNewState={setState} />
      );
      break;
    case AnonymizerMain.EXEC:
      main = <AnonExec dcmList={state.dcmList} handleNewState={setState} />;
      break;
    default:
      console.log('Invalid AnonymizerState.');
      console.log(state);
      main = default_component;
  }
  return <div>{main}</div>;
}
