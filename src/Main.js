import React, { Component } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import Websocket from 'react-websocket';

export default class Main extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: {}
    };
  }
  componentDidMount() {
    console.log('demmo');
    this.interval = setInterval(function() {
      axios.get('/status').then(function (response) {
        console.log('response', response)
      })
    }, 500)
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }
  handleData(data) {
    console.log('data', data)
  }
  render() {
    return (
      <div>
        <h2>message</h2>
      </div>
    );
  }
}
