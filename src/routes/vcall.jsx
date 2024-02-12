import React, { useEffect, useRef, useState } from "react"
import { Container, Row, Col } from "react-bootstrap"
// Replace with your own imported variables for iceServers, Janus, and server
import Janus from "../janus"
const server = "http://172.31.205.114:8088/janus"
const iceServers = []

// Helper to parse query string
const getQueryStringValue = (name) => {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")
	let regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(window.location.search)
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "))
}

function VideoCallApp() {
	const [janus, setJanus] = useState(null)
	const [videocall, setVideocall] = useState(null)
	const [opaqueId, setOpaqueId] = useState("videocalltest-" + Janus.randomString(12))
	const [localTracks, setLocalTracks] = useState({})
	const [localVideos, setLocalVideos] = useState(0)
	const [remoteTracks, setRemoteTracks] = useState({})
	const [remoteVideos, setRemoteVideos] = useState(0)
	const [bitrateTimer, setBitrateTimer] = useState(null)
	const [audioenabled, setAudioenabled] = useState(false)
	const [videoenabled, setVideoenabled] = useState(false)
	const [myusername, setMyusername] = useState(null)
	const [yourusername, setYourusername] = useState(null)
	const [doSimulcast, setDoSimulcast] = useState(getQueryStringValue("simulcast") === "yes" || getQueryStringValue("simulcast") === "true")
	const [simulcastStarted, setSimulcastStarted] = useState(false)
	const [isStart, setIsStart] = useState(false)
	const [isRegister, setIsRegister] = useState(false)

	// Handle cleanup when component unmounts
	useEffect(() => {
		return () => {
			if (janus) {
				janus.destroy()
			}
		}
	}, [janus])

	const handleStart = () => {
		setIsStart(true)
	}

	const registerUsername = () => {
		setIsRegister(true)
		// Try a registration
		// ...
	}

	const doCall = () => {
		// Call someone
		// ...
	}

	const doHangup = () => {
		// Hangup a call
		// ...
	}

	const sendData = () => {
		// Send Data
		// ...
	}

	// Helper to escape XML tags
	const escapeXmlTags = (value) => {
		// ...
	}

	// Helpers to create Simulcast-related UI, if enabled
	const addSimulcastButtons = (temporal) => {
		// ...
	}

	const updateSimulcastButtons = (substream, temporal) => {
		// ...
	}

	// useEffect(() => {
	// 	Janus.init({
	// 		debug: true,
	// 		callback: function () {
	// 			// Use a button to start the demo
	// 			$("#start").one("click", function () {
	// 				// ...
	// 			})
	// 		}
	// 	})
	// }, [])

	return (
		<div id="videocall">
			<div class="container">
				<div class="row">
					<div class="col-md-12">
						<div class="pb-2 mt-4 mb-2 border-bottom">
							<h1>
								Plugin Demo: Video Call
								<button
									class="btn btn-secondary"
									autocomplete="off"
									id="start"
									onClick={handleStart}
								>
									Start
								</button>
							</h1>
						</div>
						<div
							class="container"
							id="details"
						>
							<div class="row">
								<p>
									Press the <code>Start</code> button above to launch the demo.
								</p>
							</div>
						</div>
						<Container
							class="container hide"
							id="videocall"
						>
							<Row class="row mt-4">
								{isStart && (
									<Col
										md={6}
										class="col-md-6 container invisible"
										id="login"
									>
										<div class="input-group mt-3 mb-1">
											<span class="input-group-text">
												<i class="fa-solid fa-user"></i>
											</span>
											<input
												class="form-control"
												type="text"
												placeholder="Choose a username"
												autocomplete="off"
												id="username"
												onkeypress="return checkEnter(this, event);"
											/>
										</div>
										<button
											class="btn btn-success mb-1"
											autocomplete="off"
											id="register"
											onClick={registerUsername}
										>
											Register
										</button>
										<span
											class="hide badge bg-info"
											id="youok"
										></span>
									</Col>
								)}
								{isRegister && (
									<Col
										md={6}
										class="col-md-6 container invisible"
										id="phone"
									>
										<div class="input-group mt-3 mb-1">
											<span class="input-group-text">
												<i class="fa-solid fa-phone"></i>
											</span>
											<input
												class="form-control"
												type="text"
												placeholder="Who should we call?"
												autocomplete="off"
												id="peer"
												onkeypress="return checkEnter(this, event);"
											/>
										</div>
										<button
											class="btn btn-success mb-1"
											autocomplete="off"
											id="call"
										>
											Call
										</button>
									</Col>
								)}
							</Row>
							<Row
								id="videos"
								class="row mt-4 hide"
							>
								<div class="col-md-6">
									<div class="card">
										<div class="card-header">
											<span class="card-title">
												Local Stream
												<div class="btn-group btn-group-sm top-right hide">
													<button
														class="btn btn-danger"
														autocomplete="off"
														id="toggleaudio"
													>
														Disable audio
													</button>
													<button
														class="btn btn-danger"
														autocomplete="off"
														id="togglevideo"
													>
														Disable video
													</button>
													<div class="btn-group btn-group-sm">
														<button
															autocomplete="off"
															id="bitrateset"
															class="btn btn-primary dropdown-toggle"
															data-bs-toggle="dropdown"
														>
															Bandwidth
														</button>
														<ul
															id="bitrate"
															class="dropdown-menu"
															role="menu"
														>
															<a
																class="dropdown-item"
																href="#"
																id="0"
															>
																No limit
															</a>
															<a
																class="dropdown-item"
																href="#"
																id="128"
															>
																Cap to 128kbit
															</a>
															<a
																class="dropdown-item"
																href="#"
																id="256"
															>
																Cap to 256kbit
															</a>
															<a
																class="dropdown-item"
																href="#"
																id="512"
															>
																Cap to 512kbit
															</a>
															<a
																class="dropdown-item"
																href="#"
																id="1024"
															>
																Cap to 1mbit
															</a>
															<a
																class="dropdown-item"
																href="#"
																id="1500"
															>
																Cap to 1.5mbit
															</a>
															<a
																class="dropdown-item"
																href="#"
																id="2000"
															>
																Cap to 2mbit
															</a>
														</ul>
													</div>
												</div>
											</span>
										</div>
										<div
											class="card-body"
											id="videoleft"
										></div>
									</div>
									<div class="input-group mt-3 mb-3">
										<span class="input-group-text">
											<i class="fa-solid fa-cloud-arrow-up"></i>
										</span>
										<input
											type="text"
											class="form-control"
											placeholder="Write a DataChannel message"
											autocomplete="off"
											id="datasend"
											onkeypress="return checkEnter(this, event);"
											disabled
										/>
									</div>
								</div>
								<div class="col-md-6">
									<div class="card">
										<div class="card-header">
											<span class="card-title">
												Remote Stream
												<span
													class="badge bg-info hide"
													id="callee"
												></span>
												<span
													class="badge bg-primary hide"
													id="curres"
												></span>
												<span
													class="badge bg-info hide"
													id="curbitrate"
												></span>
											</span>
										</div>
										<div
											class="card-body"
											id="videoright"
										></div>
									</div>
									<div class="input-group mt-3 mb-3">
										<span class="input-group-text">
											<i class="fa-solid fa-cloud-arrow-down"></i>
										</span>
										<input
											type="text"
											class="form-control"
											id="datarecv"
											disabled
										/>
									</div>
								</div>
							</Row>
						</Container>
					</div>
				</div>

				<hr />
				<div class="footer"></div>
			</div>
		</div>
	)
}

export default VideoCallApp
