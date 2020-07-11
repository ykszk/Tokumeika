import React from 'react';
import './App.css';
import {
  makeStyles,
  createStyles,
  Theme,
  createMuiTheme,
  ThemeProvider,
} from '@material-ui/core/styles';
import { AppBar, Toolbar, Tabs, Tab, Box, Typography } from '@material-ui/core';
import CssBaseline from '@material-ui/core/CssBaseline';
import { cyan, pink } from '@material-ui/core/colors';

import { Anonymizer } from './anonymizer/Anonymizer';
import { Browser } from './Browser';
import { Exporter } from './Exporter';

enum TabType {
  ANON,
  BROWSE,
  EXPORT,
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: TabType;
  value: any;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    appTitle: {
      flexGrow: 1,
    },
  }),
);

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={2} color="inherit">
          <Typography component="div">{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function App() {
  const classes = useStyles();
  const [tabValue, setTabValue] = React.useState(TabType.ANON);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTabValue(newValue);
  };
  // const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersDarkMode = true;

  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: prefersDarkMode ? 'dark' : 'light',
          primary: {
            main: cyan[200],
          },
          secondary: {
            main: pink[200],
          },
        },
      }),
    [prefersDarkMode],
  );

  const tabs = (
    <Tabs
      value={tabValue}
      onChange={handleChange}
      indicatorColor="primary"
      aria-label="Tabs"
    >
      <Tab label="Anonymize" />
      <Tab label="Browse" />
      <Tab label="Export" />
    </Tabs>
  );

  const content = (
    <div className={classes.root}>
      <AppBar color="inherit" position="static">
        <Toolbar>
          <Typography variant="h4" className={classes.appTitle}>
            Tokumeika
          </Typography>
          {tabs}
        </Toolbar>
      </AppBar>
      <TabPanel value={tabValue} index={TabType.ANON}>
        <Anonymizer />
      </TabPanel>
      <TabPanel value={tabValue} index={TabType.BROWSE}>
        <Browser />
      </TabPanel>
      <TabPanel value={tabValue} index={TabType.EXPORT}>
        <Exporter />
      </TabPanel>
    </div>
  );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {content}
    </ThemeProvider>
  );
}

export default App;
