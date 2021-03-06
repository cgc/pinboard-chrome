import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import { login, fetchActiveTabStatus, saveAll, saveActiveTab } from './actions';

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
    saveActiveTab: PropTypes.func.isRequired,
    saveAll: PropTypes.func.isRequired,
    fetchActiveTabStatus: PropTypes.func.isRequired,
    urlLoading: PropTypes.bool.isRequired,
    activeTabSaved: PropTypes.bool,
  },

  componentWillMount() {
    this.props.fetchActiveTabStatus();
  },

  render() {
    const {
      saveActiveTab,
      saveAll,
      savedAll,
      urlLoading,
      activeTabSaved,
    } = this.props;

    const saveDisabled = activeTabSaved || urlLoading;
    const saveLabel = activeTabSaved ? 'saved' : urlLoading ? '...' : 'save';

    const saveAllLabel = savedAll ? 'saved all' : 'save all';

    return (<div>
      <button onClick={ saveActiveTab } disabled={ saveDisabled }>{ saveLabel }</button>
      <button onClick={ saveAll } disabled={ savedAll }>{ saveAllLabel }</button>
    </div>);
  },
});

const WrappedBookmark = connect(store => {
  const activeTab = store.tabs.find(tab => tab.active);
  return {
    urlLoading: store.urlLoading,
    activeTabSaved: store.savedURLs[activeTab.url],
    savedAll: store.savedAll,
  };
}, dispatch => ({
  fetchActiveTabStatus() {
    dispatch(fetchActiveTabStatus());
  },
  saveAll() {
    dispatch(saveAll());
  },
  saveActiveTab() {
    dispatch(saveActiveTab());
  },
}))(Bookmark);

const Popup = React.createClass({
  propTypes: {
    token: PropTypes.string,
  },

  render() {
    let main;
    const {
      tabs,
      token,
    } = this.props;
    if (!token) {
      main = <WrappedLogin />;
    } else if (!tabs) {
      main = <div></div>;
    } else {
      main = <WrappedBookmark />;
    }
    return <div style={ styles.main }>{ main }</div>;
  },
});

export const PopupContainer = connect(store => ({
  token: store.token,
  tabs: store.tabs,
}))(Popup);
