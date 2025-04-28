// import { io } from "socket.io-client"

// // Create a singleton socket instance with improved configuration
// const socket = io("https://ssbtechnology.co.in", {
//     path: "/socket.io/",
//     transports: ["websocket", "polling"],
//     reconnection: true,
//     reconnectionAttempts: 10,
//     reconnectionDelay: 1000,
//     timeout: 20000,
//     withCredentials: true,
//     autoConnect: true,
// })

// // Debug connection events
// socket.on("connect", () => {
//     console.log("Socket connected successfully", socket.id)
// })

// socket.on("connect_error", (error) => {
//     console.error("Socket connection error:", error)
// })

// socket.on("disconnect", (reason) => {
//     console.log("Socket disconnected:", reason)
// })

// // Export the socket instance
// export default socket
import { io } from "socket.io-client"

// Create a singleton socket instance with improved configuration
const socket = io("https://ssbtechnology.co.in", {
    path: "/socket.io/",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,
    withCredentials: true,
    autoConnect: true,
})

// Debug connection events
socket.on("connect", () => {
    console.log("Socket connected successfully", socket.id)
})

socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error)
})

socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason)
})

// Export the socket instance
export default socket

