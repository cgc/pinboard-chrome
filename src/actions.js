import { createAction } from 'redux-actions';
import { stringify } from 'querystring';
import invariant from 'invariant';
import throat from 'throat';

const pinboardLimiter = throat(2);

function pinboard(path, queryArg={}) {
  const query = {
    format: 'json',
    ...queryArg,
  };
  let f = pinboardLimiter(() =>
    fetch(`https://api.pinboard.in/v1${ path }?${ stringify(query) }`)
  );
  if (query.format === 'json') {
    f = f.then(response => response.json()).then(body => {
      const code = body.result_code;
      if (code && code !== 'done') {
        throw new Error(`pinboard request to ${ path } failed with ${ code }`);
      }
      return body;
    });
  }
  return f;
}

function tokenValid(token) {
  return pinboard('/user/auth_token', {
    auth_token: token, format: 'xml',
  }).then(response => {
    return response.status === 200;
  });
}

function hasPosts(token, url) {
  return pinboard('/posts/get', {
    auth_token: token,
    url: url,
  }).then(body => {
    return Boolean(body.posts.length);
  });
}

export const LOGIN = createAction('LOGIN');
export const LOGOUT = createAction('LOGOUT');
export const LOADING = createAction('LOADING');
export const NOT_LOADING = createAction('NOT_LOADING');
export const URL_LOADED = createAction('URL_LOADED');
export const HAS_POSTS = createAction('HAS_POSTS');
export const LOAD_TAB_STATE = createAction('LOAD_TAB_STATE');
export const SAVED_ALL = createAction('SAVED_ALL');

function loading(dispatch, stateKey, promiseCreator) {
  function done() {
    dispatch(NOT_LOADING(stateKey));
  }

  return function() {
    dispatch(LOADING(stateKey));
    const promise = promiseCreator.apply(this, arguments);
    promise.then(done, done);
    return promise;
  };
}

export function login(token) {
  return (dispatch) => {
    loading(dispatch, 'loginLoading', tokenValid)(token).then(isValid => {
      if (isValid) {
        dispatch(LOGIN(token));
        localStorage.setItem('token', token);
      }
    });
  };
}

export function loadTabState() {
  return (dispatch) => {
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      dispatch(LOAD_TAB_STATE(tabs.map(tab => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        active: tab.active,
      }))));
    });
  };
};

export function fetchURLSavedStatus(url) {
  return (dispatch, getState) => {
    const { token, savedURLs } = getState();
    if (url in savedURLs) {
      return Promise.resolve(savedURLs[url]);
    }
    return loading(dispatch, 'urlLoading', hasPosts)(token, url).then(urlHasPosts => {
      dispatch(HAS_POSTS({
        url: url,
        saved: urlHasPosts,
      }));
      return urlHasPosts;
    });
  };
}

export function fetchActiveTabStatus() {
  return (dispatch, getState) => {
    const { token, tabs } = getState();
    const tab = tabs.find(tab => tab.active);
    dispatch(fetchURLSavedStatus(tab.url));
  };
}

export function pinboardSave(token, { url, title }) {
  return pinboard('/posts/suggest', {
    auth_token: token,
    url: url,
  }).then(suggest => {
    const msg = 'testing to see if suggest response adheres to expectations';
    invariant(suggest.length == 2, msg);
    invariant('popular' in suggest[0], msg);
    invariant('recommended' in suggest[1], msg);
    const recommended = suggest[1].recommended;
    return pinboard('/posts/add', {
      auth_token: token,
      url,
      description: title,
      tags: recommended.join(','),
      replace: 'no',
    });
  });
}

export function save({ url, title }) {
  return (dispatch, getState) => {
    const { token } = getState();
    const promise = pinboardSave(token, { url, title }).then(() => {
      dispatch(HAS_POSTS({
        url,
        saved: true,
      }));
    });
    loading(dispatch, 'urlLoading', () => promise)();
  };
}

export function saveAll() {
  return (dispatch, getState) => {
    const { token, tabs } = getState();
    const saves = tabs.map(tab => {
      return dispatch(fetchURLSavedStatus(tab.url)).then(() => {
        if (getState().savedURLs[tab.url]) {
          return;
        }
        return pinboardSave(token, tab);
      });
    });
    // XXX loading
    Promise.all(saves).then(() => {
      dispatch(SAVED_ALL());
    });
  };
}
