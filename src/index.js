import React from 'react';
import ReactDOM from 'react-dom';
import Main from './Main';

const title = 'My Minimal React Webpack Babel Setup';

ReactDOM.render(
  <Main />,
  document.getElementById('app')
);

module.hot.accept();
