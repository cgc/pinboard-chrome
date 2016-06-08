import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import { login, fetchURLStatus, save } from './actions';

const styles = {
  main: {
    minWidth: 100,
    minHeight: 50,
  },
};

const Login = React.createClass({
  propTypes: {
    login: PropTypes.func.isRequired,
    loginLoading: PropTypes.bool.isRequired,
  },

  getInitialState() {
    return {
      token: '',
    };
  },

  onTokenUpdate(e) {
    this.setState({
      token: e.target.value,
    });
  },

  submit() {
    this.props.login(this.state.token);
  },

  render() {
    const loginLabel = this.props.loginLoading ? '...' : 'login';
    return (<div>
      <input type="text" onChange={ this.onTokenUpdate } value={ this.state.token } />
      <button onClick={ this.submit } disabled={ this.props.loginLoading }>{ loginLabel }</button>
    </div>);
  },
});

const WrappedLogin = connect(store => ({
  loginLoading: Boolean(store.loginLoading),
}), dispatch => ({
  login(token) {
    dispatch(login(token));
  },
}))(Login);

const Bookmark = React.createClass({
  propTypes: {
    save: PropTypes.func.isRequired,
    saveAll: PropTypes.func.isRequired,
    fetchURLStatus: PropTypes.func.isRequired,
    urlLoading: PropTypes.bool.isRequired,
    url: PropTypes.object.isRequired,
  },

  componentWillMount() {
    this.props.fetchURLStatus();
  },

  _save() {
    this.props.save(this.props.url);
  },

  render() {
    const {
      saveAll,
      urlLoading,
      url,
    } = this.props;

    const urlSaved = url && url.saved;

    const saveDisabled = urlSaved || urlLoading;
    const saveLabel = urlSaved ? 'saved' : urlLoading ? '...' : 'save';

    return (<div>
      <button onClick={ this._save } disabled={ saveDisabled }>{ saveLabel }</button>
      <button onClick={ saveAll }>Save All</button>
    </div>);
  },
});

const WrappedBookmark = connect(store => ({
  urlLoading: store.urlLoading,
  url: store.url,
}), dispatch => ({
  fetchURLStatus() {
    dispatch(fetchURLStatus());
  },
  save(url) {
    dispatch(save(url));
  },
}))(Bookmark);

const Popup = React.createClass({
  propTypes: {
    token: PropTypes.string,
  },

  render() {
    let main;
    if (this.props.token) {
      main = <WrappedBookmark />;
    } else {
      main = <WrappedLogin />;
    }
    return <div style={ styles.main }>{ main }</div>;
  },
});

export const PopupContainer = connect(store => ({
  token: store.token,
}))(Popup);
