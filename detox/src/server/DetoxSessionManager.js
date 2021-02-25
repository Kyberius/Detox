const log = require('../utils/logger').child({ __filename });
const DetoxInvariantError = require('../errors/DetoxInvariantError');
const DetoxConnection = require('./DetoxConnection');
const DetoxSession = require('./DetoxSession');

class DetoxSessionManager {
  constructor() {
    /** @type {Map<WebSocket, DetoxConnection>} **/
    this._connectionsByWs = new Map();
    /** @type {Map<DetoxConnection, DetoxSession>} **/
    this._sessionsByConnection = new Map();
    /** @type {Map<string, DetoxSession>} **/
    this._sessionsById = new Map();
  }

  /**
   * @param {WebSocket} ws
   * @param {Socket} socket
   */
  registerConnection(webSocket, socket) {
    if (!this._assertWebSocketIsNotUsed(webSocket)) {
      return;
    }

    const connection = new DetoxConnection({
      sessionManager: this,
      webSocket,
      socket,
    });

    this._connectionsByWs.set(webSocket, connection);
  }

  /**
   * @param {DetoxConnection} connection
   * @param {'tester' | 'app'} role
   * @param {string} sessionId
   * @returns {DetoxSession}
   */
  registerSession(connection, { role, sessionId }) {
    this._assertConnectionIsNotInSession(connection);

    let session = this._sessionsById.get(sessionId);
    if (!session) {
      session = new DetoxSession(sessionId);
      this._sessionsById.set(sessionId, session);
    }

    this._sessionsByConnection.set(connection, session);
    session[role] = connection;
    return session;
  }

  /**
   * @param {DetoxConnection} connection
   * @returns {DetoxSession|null}
   */
  getSession(connection) {
    return this._sessionsByConnection.get(connection) || null;
  }

  /**
   * @param {WebSocket} webSocket
   */
  unregisterConnection(webSocket) {
    if (!this._assertWebSocketIsUsed()) {
      return;
    }

    const connection = this._connectionsByWs.get(webSocket);
    const session = this._sessionsByConnection.get(connection);

    if (session) {
      session.disconnect(connection);

      this._sessionsByConnection.delete(connection);
      if (session.isEmpty) {
        this._sessionsById.delete(session.id);
      }
    }

    this._connectionsByWs.delete(webSocket);
  }

  _assertWebSocketIsNotUsed(webSocket) {
    if (this._connectionsByWs.has(webSocket)) {
      this._invariant('Cannot register the same WebSocket instance twice.');
      return true;
    }

    return false;
  }

  _assertWebSocketIsUsed(webSocket) {
    if (!this._connectionsByWs.has(webSocket)) {
      this._invariant('Cannot unregister an unknown WebSocket instance.');
      return true;
    }

    return false;
  }

  _assertConnectionIsNotInSession(connection) {
    if (this._sessionsByConnection.has(connection)) {
      this._invariant('Cannot login the same WebSocket instance twice into the same session.');
      return true;
    }

    return false;
  }

  _invariant(errorMessage) {
    log.error(new DetoxInvariantError(errorMessage).toString());
  }
}

module.exports = DetoxSessionManager;
