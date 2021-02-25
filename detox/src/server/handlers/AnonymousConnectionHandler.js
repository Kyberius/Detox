const DetoxRuntimeError = require('../../errors/DetoxRuntimeError');
const DetoxInvariantError = require('../../errors/DetoxInvariantError');
const AppConnectionHandler = require('./AppConnectionHandler');
const TesterConnectionHandler = require('./TesterConnectionHandler');

class AnonymousConnectionHandler {
  constructor({ api }) {
    this._api = api;
  }

  handle(action) {
    switch (action.type) {
      case 'login': return this._handleLoginAction(action);
      default: return this._handleUnknownAction(action);
    }
  }

  _handleLoginAction(action) {
    if (!action.params) {
      throw new DetoxRuntimeError({
        message: `Invalid login action received, it has no .params`,
        hint: DetoxInvariantError.reportIssue,
        debugInfo: action,
      });
    }

    if (action.params.role !== 'app' && action.params.role !== 'tester') {
      throw new DetoxRuntimeError({
        message: `Invalid login action received, it has invalid .role`,
        hint: DetoxInvariantError.reportIssue,
        debugInfo: action,
      });
    }

    if (!action.params.sessionId) {
      throw new DetoxRuntimeError({
        message: `Invalid login action received, it has no .sessionId`,
        hint: DetoxInvariantError.reportIssue,
        debugInfo: action,
      });
    }

    if (typeof action.params.sessionId !== 'string') {
      throw new DetoxRuntimeError({
        message: `Invalid login action received, it has a non-string .sessionId`,
        hint: DetoxInvariantError.reportIssue,
        debugInfo: action,
      });
    }

    const session = this._api.registerSession(action.params);
    const Handler = action.params.role === 'app' ? AppConnectionHandler : TesterConnectionHandler;
    this._api.setHandler(new Handler({
      api: this._api,
      session,
    }));

    this.sendAction({
      ...action,
      type: 'loginSuccess',
    });
  }

  _handleUnknownAction(action) {
    throw new DetoxRuntimeError({
      message: `Action dispatched too early, there is no session to use:`,
      hint: DetoxInvariantError.reportIssue,
      debugInfo: action,
    });
  }
}

module.exports = AnonymousConnectionHandler;
