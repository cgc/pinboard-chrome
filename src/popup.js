import React, { useEffect, useState, useContext, useReducer, useMemo } from 'react';
import PropTypes from 'prop-types';
import { init, reducer } from './reducer';
import { fetchActiveTabStatus, loadTabState, login, saveActiveTab, saveAll } from './actions';

const styles = {
  main: {
    minWidth: 100,
    minHeight: 50,
  },
};

function Login({
  loginLoading,
}) {
  const [token, setToken] = useState('');
  const dispatch = useContext(DispatchContext);

  const loginLabel = loginLoading ? '...' : 'login';
  return (<div>
    <input placeholder='auth token' type="text" onChange={ (e) => setToken(e.target.value) } value={ token } />
    <button onClick={ (e) => dispatch(login(token)) } disabled={ loginLoading }>{ loginLabel }</button>
  </div>);
}

Login.propTypes = {
  loginLoading: PropTypes.bool.isRequired,
};

function Bookmark({
  savedAll,
  urlLoading,
  savedURLs,
  tabs,
}) {
  const dispatch = useContext(DispatchContext);
  useEffect(() => {
    dispatch(fetchActiveTabStatus());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // We explicitly only want these to run once.

  const activeTab = tabs.find(tab => tab.active);
  const activeTabSaved = savedURLs[activeTab.url];

  const saveDisabled = activeTabSaved || urlLoading;
  const saveLabel = activeTabSaved ? 'saved' : urlLoading ? '...' : 'save';

  const saveAllLabel = savedAll ? 'saved all' : 'save all';

  return (<div>
    <button onClick={ () => dispatch(saveActiveTab()) } disabled={ saveDisabled }>{ saveLabel }</button>
    <button onClick={ () => dispatch(saveAll()) } disabled={ savedAll }>{ saveAllLabel }</button>
  </div>);
}

Bookmark.propTypes = {
  tabs: PropTypes.array.isRequired,
  savedURLs: PropTypes.object.isRequired,
  urlLoading: PropTypes.bool.isRequired,
  savedAll: PropTypes.bool.isRequired,
};

export function Popup({
  // eslint-disable-next-line react/prop-types
  state
}) {
  // eslint-disable-next-line react/prop-types
  const {token, tabs, savedAll, urlLoading, savedURLs, loginLoading} = state;
  let main;
  if (!token) {
    main = <Login loginLoading={loginLoading} />;
  } else if (!tabs) {
    main = <div></div>;
  } else {
    main = <Bookmark tabs={tabs} savedAll={savedAll} urlLoading={urlLoading} savedURLs={savedURLs} />;
  }
  return <div style={ styles.main }>{ main }</div>;
}

const DispatchContext = React.createContext(null);

function useReducer2(reducer, initialValue) {
  const [state, dispatchOrig] = useReducer(reducer, initialValue);
  dispatchOrig._state = state;
  const dispatch = useMemo(() => function dispatch(fn) {
    // This is a bit of a hack to get an interface that's like redux/redux-thunk
    // In particular, I'm storing a reference to latest state on re-renders so the below call
    // can always be up-to-date.
    // HACK: I'm not entirely sure this memoization is working correctly...
    return fn instanceof Function ? fn(dispatch, () => dispatchOrig._state) : dispatchOrig(fn);
  }, [dispatchOrig]);
  return [state, dispatch];
}

export function App() {
  const [state, dispatch] = useReducer2(reducer, init());

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      dispatch(reducer.LOGIN(storedToken));
    }

    dispatch(loadTabState());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // We explicitly only want these to run once.

  return (
    <DispatchContext.Provider value={dispatch}>
      <Popup state={state} />
    </DispatchContext.Provider>
  );
}
