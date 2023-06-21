import React from "react"
import { useNavigate } from "react-router-dom"

export default function Home() {
	const navigate = useNavigate()

	const handleJoinRoom = () => {
		navigate("/room")
	}
	return (
		<div className="App">
			<header className="App-header">
				{/* <img src={logo} className="App-logo" alt="logo" /> */}
				<p>
					Welcome to <code>Reunitus</code> video room (powered by Janus).
				</p>
				<button onClick={handleJoinRoom}>Join Room</button>
			</header>
		</div>
	)
}
