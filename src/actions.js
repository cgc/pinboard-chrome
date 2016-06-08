import { createAction } from 'redux-actions';
import { stringify } from 'querystring';
import invariant from 'invariant';

function pinboard(path, queryArg={}) {
  const query = {
    format: 'json',
    ...queryArg,
  };
  let f = fetch(`https://api.pinboard.in/v1${ path }?${ stringify(query) }`);
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

export function fetchURLStatus() {
  return (dispatch, getState) => {
    const { token } = getState();
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
      const tab = tabs[0];
      loading(dispatch, 'urlLoading', hasPosts)(token, tab.url).then(urlHasPosts => {
        dispatch(URL_LOADED({
          url: tab.url,
          title: tab.title,
          saved: urlHasPosts,
        }));
      });
    });
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
      dispatch(URL_LOADED({
        url,
        title,
        saved: true,
      }));
    });
    loading(dispatch, 'urlLoading', () => promise)();
  };
}
