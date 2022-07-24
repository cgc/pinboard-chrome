import PropTypes from 'prop-types';
import React, { useEffect, useState, useContext } from 'react';

const DispatchContext = React.createContext(null);
const StateContext = React.createContext(null);

export function useStoreState() {
    return useContext(StateContext);
}

export function useDispatch() {
    return useContext(DispatchContext);
}

export function StoreProvider({ store, children }) {
  const [_state, setState] = useState(store.state);
  useEffect(() => {
    // subscribe() returns a function to remove the listener
    return store.subscribe(() => {
      setState(store.state);
    });
    // TODO: avoid updates here
  });
  return <DispatchContext.Provider value={store.dispatch}>
    <StateContext.Provider value={store.state}>
      {children}
    </StateContext.Provider>
  </DispatchContext.Provider>;
}

StoreProvider.propTypes = {
    store: PropTypes.shape({
        state: PropTypes.object,
        dispatch: PropTypes.func,
        subscribe: PropTypes.func,
    }),
    children: PropTypes.node,
};

export class Store {
  constructor(reducer, initialState) {
    this.reducer = reducer;
    this.state = initialState;
    this.events = new EventTarget()
  }
  subscribe(fn) {
    this.events.addEventListener('state', fn);
    return () => {
      this.events.removeEventListener('state', fn);
    };
  }
  dispatch = (action) => {
    if (action instanceof Function) {
      return action(this.dispatch, () => this.state);
    }

    const prev = this.state;
    // Update state
    this.state = this.reducer(this.state, action);
    // Signal when changed
    if (!Object.is(this.state, prev)) {
      // Could alternatively consider: new CustomEvent('state', {detail: 3})
      this.events.dispatchEvent(new Event('state'));
    }
  }
}
