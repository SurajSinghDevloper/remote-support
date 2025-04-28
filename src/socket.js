import { io } from "socket.io-client"

/**
 * Socket client for remote support application
 * Provides direct control of the host machine with minimal latency
 */
class SocketClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl || "https://ssbtechnology.co.in"
        this.socket = null
        this.connected = false
        this.eventHandlers = {}
        this.currentRoom = null
        this.role = null
    }

    connect() {
        // Connect to socket server with optimized settings
        this.socket = io(this.serverUrl, {
            path: "/socket.io/",
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000,
            forceNew: true,
            autoConnect: true,
        })

        // Set up connection events
        this.socket.on("connect", () => {
            console.log("Socket connected:", this.socket.id)
            this.connected = true
            this._triggerEvent("connect")

            // Rejoin room if we were in one
            if (this.currentRoom) {
                this.joinRoom(this.currentRoom, this.role)
            }
        })

        this.socket.on("connect_error", (error) => {
            console.error("Socket connection error:", error)
            this.connected = false
            this._triggerEvent("connect_error", error)
        })

        this.socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason)
            this.connected = false
            this._triggerEvent("disconnect", reason)
        })

        return this
    }

    joinRoom(code, role) {
        if (!this.socket || !this.connected) {
            console.error("Cannot join room: Socket not connected")
            return false
        }

        this.currentRoom = code
        this.role = role

        console.log(`Joining room ${code} as ${role}`)
        this.socket.emit("join-room", { code, role })
        return true
    }

    on(event, callback) {
        if (!this.socket) {
            console.error("Socket not initialized")
            return this
        }

        this.socket.on(event, callback)

        // Also store in our event handlers for reconnection
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = []
        }
        this.eventHandlers[event].push(callback)

        return this
    }

    emit(event, data) {
        if (!this.socket || !this.connected) {
            console.error(`Cannot emit ${event}: Socket not connected`)
            return false
        }

        this.socket.emit(event, data)
        return true
    }

    // Volatile events may be dropped if network is congested
    emitVolatile(event, data) {
        if (!this.socket || !this.connected) {
            return false
        }

        this.socket.volatile.emit(event, data)
        return true
    }

    // Trigger registered event handlers
    _triggerEvent(event, ...args) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach((callback) => {
                try {
                    callback(...args)
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error)
                }
            })
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect()
        }
        this.connected = false
    }

    isConnected() {
        return this.connected
    }
}

// Create a singleton instance
const socketClient = new SocketClient()

export default socketClient
