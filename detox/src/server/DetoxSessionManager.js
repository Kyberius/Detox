const log = require('../utils/logger').child({ __filename });
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
    this._assertWebSocketIsNotUsed(webSocket);

    const connection = new DetoxConnection({
      sessionManager: this,
      webSocket,
      socket,
    });

    this._connectionsByWs.set(webSocket, connection);
  }

  registerSession(connection, { role, sessionId }) {
    this._assertConnectionIsNotInSession(connection);

    let session = this._sessionsById.get(sessionId);
    if (!session) {
      session = new DetoxSession(sessionId);
      this._sessionsById.set(sessionId, session);
      log.debug({ event: 'SESSION_CREATED' }, `${sessionId}:${role}`);
    } else {
      log.debug({ event: 'SESSION_JOINED' }, `${sessionId}:${role}`);
    }

    this._sessionsByConnection.set(connection, session);
    session[role] = connection;
    return session;
  }

  getSession(connection) {
    return this._sessionsByConnection.get(connection) || null;
  }

  unregisterConnection(connection) {
    const session = this._sessionsByConnection.get(connection);
    if (session) {
      session.disconnect(connection);

      this._sessionsByConnection.delete(connection);
      if (session.isEmpty) {
        this._sessionsById.delete(session.id);
      }
    }

    if (this._connectionsByWs.has(connection.webSocket)) {
      this._connectionsByWs.delete(connection.webSocket);
    } else {
      throw new Error('Cannot unregister an unknown connection');
    }
  }

  _assertWebSocketIsNotUsed(ws) {
    if (this._connectionsByWs.has(ws)) {
      throw new Error('Cannot register the same connection twice');
    }
  }

  _assertConnectionIsNotInSession(connection) {
    const session = this._sessionsByConnection.get(connection);
    if (session) {
      throw new Error('Cannot register an already used connection (session)');
    }
  }
}

module.exports = DetoxSessionManager;
