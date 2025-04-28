import { io } from "socket.io-client"

/**
 * Enhanced Socket Client with dual channel architecture
 * - Control channel: Low-latency, high-priority for mouse/keyboard events
 * - Screen channel: Optimized for screen sharing with adaptive quality
 */
class SocketClient {
    constructor(serverUrl, options = {}) {
        this.serverUrl = serverUrl || "https://ssbtechnology.co.in"
        this.options = {
            reconnectionAttempts: options.reconnectionAttempts || 10,
            reconnectionDelay: options.reconnectionDelay || 1000,
            timeout: options.timeout || 20000,
            ...options,
        }

        this.controlSocket = null
        this.screenSocket = null
        this.eventHandlers = {
            control: {},
            screen: {},
        }
        this.connected = {
            control: false,
            screen: false,
        }
    }

    connect() {
        // Connect to control channel
        this.controlSocket = io(`${this.serverUrl}/control`, {
            path: "/socket.io/",
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: this.options.reconnectionAttempts,
            reconnectionDelay: this.options.reconnectionDelay,
            timeout: this.options.timeout,
            withCredentials: true,
            autoConnect: true,
        })

        // Connect to screen channel
        this.screenSocket = io(`${this.serverUrl}/screen`, {
            path: "/socket.io/",
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: this.options.reconnectionAttempts,
            reconnectionDelay: this.options.reconnectionDelay,
            timeout: this.options.timeout,
            withCredentials: true,
            autoConnect: true,
        })

        // Set up connection event handlers for control channel
        this.controlSocket.on("connect", () => {
            console.log("Control channel connected:", this.controlSocket.id)
            this.connected.control = true
            this._triggerEvent("control", "connect")
        })

        this.controlSocket.on("connect_error", (error) => {
            console.error("Control channel connection error:", error)
            this._triggerEvent("control", "connect_error", error)
        })

        this.controlSocket.on("disconnect", (reason) => {
            console.log("Control channel disconnected:", reason)
            this.connected.control = false
            this._triggerEvent("control", "disconnect", reason)
        })

        // Set up connection event handlers for screen channel
        this.screenSocket.on("connect", () => {
            console.log("Screen channel connected:", this.screenSocket.id)
            this.connected.screen = true
            this._triggerEvent("screen", "connect")
        })

        this.screenSocket.on("connect_error", (error) => {
            console.error("Screen channel connection error:", error)
            this._triggerEvent("screen", "connect_error", error)
        })

        this.screenSocket.on("disconnect", (reason) => {
            console.log("Screen channel disconnected:", reason)
            this.connected.screen = false
            this._triggerEvent("screen", "disconnect", reason)
        })

        return this
    }

    joinRoom(code, role) {
        if (!code) {
            console.error("Room code is required")
            return
        }

        // Join both channels with the same room code
        this.controlSocket.emit("join-room", { code, role })
        this.screenSocket.emit("join-room", { code, role })

        return this
    }

    // Control channel methods
    onControl(event, callback) {
        if (!this.controlSocket) {
            console.error("Control socket not initialized")
            return this
        }

        this.controlSocket.on(event, callback)
        return this
    }

    emitControl(event, data) {
        if (!this.controlSocket || !this.connected.control) {
            console.error("Control socket not connected")
            return false
        }

        this.controlSocket.emit(event, data)
        return true
    }

    // Screen channel methods
    onScreen(event, callback) {
        if (!this.screenSocket) {
            console.error("Screen socket not initialized")
            return this
        }

        this.screenSocket.on(event, callback)
        return this
    }

    emitScreen(event, data) {
        if (!this.screenSocket || !this.connected.screen) {
            console.error("Screen socket not connected")
            return false
        }

        this.screenSocket.emit(event, data)
        return true
    }

    // Register event handlers
    on(channel, event, callback) {
        if (!this.eventHandlers[channel]) {
            this.eventHandlers[channel] = {}
        }

        if (!this.eventHandlers[channel][event]) {
            this.eventHandlers[channel][event] = []
        }

        this.eventHandlers[channel][event].push(callback)
        return this
    }

    // Trigger registered event handlers
    _triggerEvent(channel, event, ...args) {
        if (this.eventHandlers[channel] && this.eventHandlers[channel][event]) {
            this.eventHandlers[channel][event].forEach((callback) => {
                try {
                    callback(...args)
                } catch (error) {
                    console.error(`Error in ${channel} ${event} handler:`, error)
                }
            })
        }
    }

    // Disconnect from both channels
    disconnect() {
        if (this.controlSocket) {
            this.controlSocket.disconnect()
        }

        if (this.screenSocket) {
            this.screenSocket.disconnect()
        }

        this.connected.control = false
        this.connected.screen = false
    }

    // Check if both channels are connected
    isConnected() {
        return this.connected.control && this.connected.screen
    }
}

// Create a singleton instance
const socketClient = new SocketClient("https://ssbtechnology.co.in")

export default socketClient
