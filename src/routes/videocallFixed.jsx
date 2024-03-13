import React, { useState, useEffect, useRef } from "react"
import { Button, Container, Row, Col, Form, Card, ButtonGroup, Dropdown } from "react-bootstrap"
import Janus from "../janus"
import DialogSimple from "../components/Dialog"

// const server = "https://webrtc.sedap.app/janus"
// const server = "http://webrtc.teknologi40.online/janus"
const server = "http://172.31.205.114:8088/janus"
const iceServers = []
// const iceServers = [{ urls: "stun:stun.l.google.com:19302" }]

const getQueryStringValue = (name) => {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")
	let regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(window.location.search)
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "))
}

export default function FullVideoCallPage() {
	const localRef = useRef(null)
	const remoteRef = useRef(null)
	const [janus, setJanus] = useState(null)
	const [videocall, setVideocall] = useState(null)
	const [opaqueId, setOpaqueId] = useState("videocalltest-" + Janus.randomString(12))

	// const [trackId, setTrackID] = useState(null)
	const [mid, setMid] = useState(null)
	// const [localTracks, setLocalTracks] = useState({})
	// const [localVideos, setLocalVideos] = useState(0)

	// const [remoteTracks, setRemoteTracks] = useState({})
	// const [remoteVideos, setRemoteVideos] = useState(0)

	const [audioenabled, setAudioenabled] = useState(false)
	const [videoenabled, setVideoenabled] = useState(false)
	const [audioRightEnabled, setAudioRightEnabled] = useState(false)
	const [videoRightEnabled, setVideoRightEnabled] = useState(false)

	const [bitrateTimer, setBitrateTimer] = useState(null)
	const [bitrate, setBitrate] = useState(null)

	const [peervideo, setPeerVideo] = useState(null)

	const [noVideo, setNoVideo] = useState(false)
	const [doSimulcast, setDoSimulcast] = useState(getQueryStringValue("simulcast") === "yes" || getQueryStringValue("simulcast") === "true")
	const [simulcastStarted, setSimulcastStarted] = useState(false)

	const [myusername, setMyUsername] = useState(null)
	const [yourUsername, setYourUsername] = useState(null)

	const [isStart, setIsStart] = useState(false)
	const [isRegister, setIsRegister] = useState(false)
	const [registered, setRegistered] = useState(false)
	const [isCalling, setIsCalling] = useState(false)
	const [dialogcall, setDialogCall] = useState(false)

	const [jsepcall, setJsepCall] = useState(false)
	const [listUser, setListUser] = useState([])

	const addSimulcastButtons = (temporal) => {
		// ...
	}

	const updateSimulcastButtons = (substream, temporal) => {
		// ...
	}

	const onCloseDialogCall = () => {
		setDialogCall(false)
		// doHangup()
	}

	const handleCall = (row) => {
		videocall.createOffer({
			tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true, simulcast: doSimulcast }, { type: "data" }],
			success: function (jsep) {
				console.debug("Got SDP!", jsep)
				setVideoenabled(true)
				setJsepCall(jsep)

				// setAudioenabled(true)
				// setVideoenabled(true)
				let body = { request: "call", username: row }
				videocall.send({ message: body, jsep: jsep })
				setIsCalling(true)
				setYourUsername(row)
			},
			error: function (error) {
				Janus.error("WebRTC error...", error)
				console.log("WebRTC error...", error)

				setIsCalling(false)
			}
		})
	}

	const handleStart = () => {
		Janus.init({
			debug: true,
			callback: function () {
				if (!Janus.isWebrtcSupported()) {
					alert("No WebRTC support... ")
					return
				}

				let janus = new Janus({
					server: server,
					iceServers: iceServers,
					success: function () {
						// Attach to VideoCall plugin
						let newPlugin = null
						janus.attach({
							plugin: "janus.plugin.videocall",
							opaqueId: opaqueId,
							success: function (pluginHandle) {
								setVideocall(pluginHandle)
								newPlugin = pluginHandle
								console.log("pluginHandle", "Plugin attached! (" + pluginHandle.getPlugin() + ", id=" + pluginHandle.getId() + ")")
								setIsStart(true)
							},
							error: function (error) {
								alert("  -- Error attaching plugin... " + error)
							},
							consentDialog: function (on) {
								console.log("Consent dialog should be " + (on ? "on" : "off") + " now")
							},
							iceState: function (state) {
								console.log("ICE state changed to " + state)
							},
							mediaState: function (medium, on, mid) {
								console.log("Janus " + (on ? "started" : "stopped") + " receiving our " + medium + " (mid=" + mid + ")")
							},
							webrtcState: function (on) {
								console.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now")
								// $("#videoleft").parent().unblock()
							},
							slowLink: function (uplink, lost, mid) {
								console.log("Janus reports problems " + (uplink ? "sending" : "receiving") + " packets on mid " + mid + " (" + lost + " lost packets)")
							},
							onmessage: function (msg, jsep) {
								console.log(" ::: Got a message :::", msg)
								let result = msg["result"]
								setListUser(result?.list)

								if (result) {
									if (result["list"]) {
										let list = result["list"]
										Janus.debug("Got a list of registered peers:", list)
										for (let mp in list) {
											Janus.debug("  >> [" + list[mp] + "]")
										}
									} else if (result["event"]) {
										let event = result["event"]
										if (event === "registered") {
											setRegistered(true)
											let _myusername = result["username"]
											setMyUsername(_myusername)
											Janus.log("Successfully registered as " + _myusername + "!")

											newPlugin.send({ message: { request: "list" } })
										} else if (event === "calling") {
											console.log("Waiting for the peer to answer...")
											// TODO Any ringtone?
											alert("Waiting for the peer to answer...")
										} else if (event === "incomingcall") {
											console.log("Incoming call from " + result["username"] + "!")

											let _yourusername = result["username"]
											setYourUsername(_yourusername)
											setDialogCall(true)
											setJsepCall(jsep)
										} else if (event === "accepted") {
											let peer = result["username"]
											if (!peer) {
												console.log("Call started!")
											} else {
												console.log(peer + " accepted the call!")
												setYourUsername(peer)
											}
											// Video call can start
											console.log("jsep", jsep, jsepcall)
											if (jsep) {
												newPlugin.handleRemoteJsep({ jsep: jsep })
											}
										}
										// else if (event === "update") {
										// 	// An 'update' event may be used to provide renegotiation attempts
										// 	if (jsep) {
										// 		if (jsep.type === "answer") {
										// 			newPlugin.handleRemoteJsep({ jsep: jsep })
										// 			console.log("answer")
										// 		} else {
										// 			newPlugin.createAnswer({
										// 				jsep: jsep,
										// 				// We want bidirectional audio and video, if offered,
										// 				// plus data channels too if they were negotiated
										// 				tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true }, { type: "data" }],
										// 				success: function (jsep) {
										// 					console.log("Got SDP!", jsep)
										// 					let body = { request: "set" }
										// 					setJsepCall(jsep)
										// 					newPlugin.send({ message: body, jsep: jsep })
										// 				},
										// 				error: function (error) {
										// 					console.log("WebRTC error:", error)
										// 					alert("WebRTC error... " + error.message)
										// 				}
										// 			})
										// 		}
										// 	}
										// }
										// else if (event === "hangup") {
										// 	console.log("Call hung up by " + result["username"] + " (" + result["reason"] + ")!")

										// 	newPlugin.hangup()
										// 	doHangup()
										// } else if (event === "simulcast") {
										// 	// Is simulcast in place?
										// 	let substream = result["substream"]
										// 	let temporal = result["temporal"]
										// 	if ((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
										// 		if (!simulcastStarted) {
										// 			simulcastStarted = true
										// 			addSimulcastButtons(result["videocodec"] === "vp8")
										// 		}
										// 		// We just received notice that there's been a switch, update the buttons
										// 		updateSimulcastButtons(substream, temporal)
										// 	}
										// }
									}
								} else {
									let error = msg["error"]
									alert(error)
									newPlugin.hangup()
								}
							},
							onlocaltrack: async function (track, on) {
								console.log("Local track " + (on ? "added" : "removed") + ":", track)

								let localTracks = {}
								let localVideos = 0

								let trackId = track.id.replace(/[{}]/g, "")

								if (!on) {
									// Track removed, get rid of the stream and the rendering
									let stream = localTracks[trackId]
									if (stream) {
										try {
											let tracks = stream.getTracks()
											for (let i in tracks) {
												let mst = tracks[i]
												if (mst !== null && mst !== undefined) mst.stop()
											}
										} catch (e) {}
									}

									if (track.kind === "video") {
										document.getElementById(`myvideo${trackId}`).remove()

										localVideos--
										if (localVideos === 0) {
											let noVideoContainer = document.querySelector("#videoleft .no-video-container")

											console.log("noVideoContainer", noVideoContainer)
											if (noVideoContainer === null) {
												document.getElementById("videoleft").insertAdjacentHTML(
													"beforeend",
													`<div class="no-video-container">
													 <i class="fa-solid fa-video fa-xl no-video-icon"></i>
													 <span class="no-video-text">No webcam available</span>
												   </div>`
												)
											}
										}
									}
									delete localTracks[trackId]
									return
								}
								// If we're here, a new track was added
								let stream = localTracks[trackId]
								if (stream) {
									// We've been here already
									return
								}

								if (document.querySelectorAll("#videoleft video").length === 0) {
									document.getElementById("videos").classList.remove("hide")
								}

								// setVideoenabled(true)
								if (track.kind === "audio") {
									// We ignore local audio tracks, they'd generate echo anyway
									if (localVideos === 0) {
										// setNoVideo(true)
										// No video, at least for now: show a placeholder
										let noVideoContainer = document.querySelector("#videoleft .no-video-container")
										if (noVideoContainer === null) {
											document.getElementById("videoleft").insertAdjacentHTML(
												"beforeend",
												`<div class="no-video-container">
												 <i class="fa-solid fa-video fa-xl no-video-icon"></i>
												 <span class="no-video-text">No webcam available</span>
											   </div>`
											)
										}
									}
								} else {
									// New video track: create a stream out of it
									localVideos++
									document.querySelector("#videoleft .no-video-container")?.remove()

									stream = new MediaStream([track])
									localTracks[trackId] = stream

									Janus.log("Created local stream:", stream)
									// setVideoenabled(true)

									document.getElementById("videoleft").insertAdjacentHTML("beforeend", `<video class="rounded centered" id="myvideo${trackId}" width="100%" height="100%" autoplay playsinline muted="muted"/>`)

									let videoElement = document.getElementById(`myvideo${trackId}`)

									if (videoElement) {
										Janus.attachMediaStream(videoElement, stream)
									}
								}
								if (newPlugin.webrtcStuff.pc.iceConnectionState !== "completed" && newPlugin.webrtcStuff.pc.iceConnectionState !== "connected") {
									console.log("publishing here")
									// let parentElement = document.getElementById("videoleft").parentElement
									// if (parentElement) {
									// 	parentElement.block({
									// 		message: "<b>Publishing...</b>",
									// 		css: {
									// 			border: "none",
									// 			backgroundColor: "transparent",
									// 			color: "white"
									// 		}
									// 	})
									// }
								}
							},
							onremotetrack: function (track, mid, on, metadata) {
								console.log("Remote track (mid=" + mid + ") " + (on ? "added" : "removed") + (metadata ? " (" + metadata.reason + ") " : "") + ":", track)
								let remoteTracks = {}
								let remoteVideos = 0

								let peerElement = document.getElementById(`peervideo${mid}`)

								if (!on) {
									// Track removed, get rid of the stream and the rendering
									// peerElement.remove()
									// document.getElementById(`peervideo${mid}`).remove()

									setPeerVideo(null)
									if (track.kind === "video") {
										remoteVideos--
										if (remoteVideos === 0) {
											let noVideoContainer = document.querySelector("#videoright .no-video-container")
											// No video, at least for now: show a placeholder
											if (noVideoContainer === null) {
												document.getElementById("videoright").insertAdjacentHTML(
													"beforeend",
													`<div class="no-video-container">
													 <i class="fa-solid fa-video fa-xl no-video-icon"></i>
													 <span class="no-video-text">No webcam available</span>
												   </div>`
												)
											}
										}
									}
									delete remoteTracks[mid]
									return
								}

								if (peerElement) return

								// If we're here, a new track was added
								setIsCalling(false)

								let addButtons = false
								if (document.querySelectorAll("#videoright audio") === null && document.querySelectorAll("#videoright video") === null) {
									addButtons = true
									setIsCalling(true)
									document.getElementById("videos").classList.remove("hide")
								}

								if (track.kind === "audio") {
									// New audio track: create a stream out of it, and use a hidden <audio> element
									let stream = new MediaStream([track])
									remoteTracks[mid] = stream
									console.log("Created remote audio stream:", stream)
									document.getElementById("videoright").insertAdjacentHTML(
										"beforeend",
										`
									<audio class="hide" id="peervideo${mid}" autoplay playsinline/>`
									)

									let audioElement = document.getElementById(`peervideo${mid}`)
									if (audioElement) {
										Janus.attachMediaStream(audioElement, stream)
									}

									if (remoteVideos === 0) {
										let noVideoContainer = document.querySelector("#videoright .no-video-container")
										// No video, at least for now: show a placeholder
										if (noVideoContainer === null) {
											document.getElementById("videoright").insertAdjacentHTML(
												"beforeend",
												`<div class="no-video-container">
													 <i class="fa-solid fa-video fa-xl no-video-icon"></i>
													 <span class="no-video-text">No webcam available</span>
												   </div>`
											)
										}
									}
								} else {
									setPeerVideo(mid)
									// New video track: create a stream out of it
									remoteVideos++
									document.querySelector("#videoright .no-video-container")?.remove()

									let stream = new MediaStream([track])
									remoteTracks[mid] = stream
									console.log("Created remote video stream:", stream)

									document.getElementById("videoright").insertAdjacentHTML(
										"beforeend",
										`
									<video class="rounded centered" id="peervideo${mid}" width="100%" height="100%" autoplay playsinline/>`
									)

									let videoElement = document.getElementById(`peervideo${mid}`)

									if (videoElement) {
										Janus.attachMediaStream(videoElement, stream)
									}

									// Janus.attachMediaStream($("#peervideo" + mid).get(0), stream)
									// Note: we'll need this for additional videos too
									// if (!bitrateTimer) {
									// 	document.getElementById("curbitrate").classList.remove("hide")

									// 	let _bitrateTimer = setInterval(function () {
									// 		if (!videoElement) return
									// 		// Display updated bitrate, if supported
									// 		const currentBitrate = videocall.getBitrate()
									// 		setBitrate(currentBitrate)

									// 		console.log("Current bitrate is " + videocall.getBitrate())

									// 		document.getElementById("curbitrate").text(bitrate)
									// 		// Check if the resolution changed too
									// 		let width = videoElement.videoWidth
									// 		let height = videoElement.videoHeight
									// 		if (width > 0 && height > 0) {
									// 			document.getElementById("curres").classList.remove("hide")
									// 			document.getElementById("curres").innerText = `${width}x${height}`
									// 		}
									// 	}, 1000)

									// 	setBitrateTimer(_bitrateTimer)
									// }
								}
								if (!addButtons) return
								// Enable audio/video buttons and bitrate limiter
								// audioenabled = true
								// videoenabled = true
								// $("#toggleaudio")
								// 	.removeAttr("disabled")
								// 	.click(function () {
								// 		audioenabled = !audioenabled
								// 		if (audioenabled) $("#toggleaudio").html("Disable audio").classList.remove("btn-success").addClass("btn-danger")
								// 		else $("#toggleaudio").html("Enable audio").classList.remove("btn-danger").addClass("btn-success")
								// 		videocall.send({ message: { request: "set", audio: audioenabled } })
								// 	})
								// $("#togglevideo")
								// 	.removeAttr("disabled")
								// 	.click(function () {
								// 		videoenabled = !videoenabled
								// 		if (videoenabled) $("#togglevideo").html("Disable video").classList.remove("btn-success").addClass("btn-danger")
								// 		else $("#togglevideo").html("Enable video").classList.remove("btn-danger").addClass("btn-success")
								// 		videocall.send({ message: { request: "set", video: videoenabled } })
								// 	})
								// $("#toggleaudio").parent().classList.remove("hide")
								// $("#bitrate a")
								// 	.removeAttr("disabled")
								// 	.click(function () {
								// 		$(".dropdown-toggle").dropdown("hide")
								// 		let id = $(this).attr("id")
								// 		let bitrate = parseInt(id) * 1000
								// 		if (bitrate === 0) {
								// 			Janus.log("Not limiting bandwidth via REMB")
								// 		} else {
								// 			Janus.log("Capping bandwidth to " + bitrate + " via REMB")
								// 		}
								// 		$("#bitrateset").text($(this).text()).parent().classList.remove("open")
								// 		videocall.send({ message: { request: "set", bitrate: bitrate } })
								// 		return false
								// 	})
							},
							oncleanup: function () {
								console.log(" ::: Got a cleanup notification :::")
								Janus.log(" ::: Got a cleanup notification :::")

								setMyUsername(null)
								setYourUsername(null)
								setIsRegister(false)
								setIsStart(false)
							}
						})
					},
					error: function (error) {
						console.log("janus error", error)
						// Janus.error(error)
						alert(error, function () {
							window.location.reload()
						})
					},
					destroyed: function () {
						window.location.reload()
					}
				})

				// setJanus(janus)
			}
		})
	}

	const onRegister = () => {
		setIsRegister(true)
		let register = { request: "register", username: myusername }
		videocall.send({ message: register })
	}

	const doCall = async () => {
		await videocall.createOffer({
			tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true, simulcast: doSimulcast }, { type: "data" }],
			success: function (jsep) {
				console.debug("Got SDP!", jsep)
				setVideoenabled(true)
				setJsepCall(jsep)

				// setAudioenabled(true)
				// setVideoenabled(true)
				let body = { request: "call", username: yourUsername }
				videocall.send({ message: body, jsep: jsep })
				setIsCalling(true)
			},
			error: function (error) {
				Janus.error("WebRTC error...", error)
				console.log("WebRTC error...", error)

				setIsCalling(false)
			}
		})
	}

	const doHangup = () => {
		// $('#call').attr('disabled', true).unbind('click');
		let hangup = { request: "hangup" }
		videocall.send({ message: hangup })
		videocall.hangup()
		setYourUsername(null)
		setVideoenabled(false)
		setVideoRightEnabled(false)
	}

	const doAnswerCall = () => {
		videocall.createAnswer({
			jsep: jsepcall,
			// We want bidirectional audio and video, if offered,
			// plus data channels too if they were negotiated
			tracks: [
				{ type: "audio", capture: true, recv: true },
				{ type: "video", capture: true, recv: true }
				// { type: "data" }
			],
			success: function (jsep) {
				console.log("answer success!", jsep)
				setVideoRightEnabled(true)
				let body = { request: "accept" }
				videocall.send({ message: body, jsep: jsep })
				setDialogCall(false)
			},
			error: function (error) {
				console.log("answer error:", error)
				setDialogCall(false)

				alert("WebRTC error... " + error)
			}
		})
	}

	useEffect(() => {
		return () => {
			if (janus) {
				janus.destroy()
			}
		}
	}, [janus])
	return (
		<div style={{ width: "100%" }}>
			<Container fluid="lg">
				<Row className="justify-content-center ">
					<Col
						lg={12}
						className="pb-2 mt-4 mb-2 "
					>
						<Button
							variant="primary"
							onClick={handleStart}
							id="start"
						>
							Start
						</Button>
					</Col>
				</Row>

				{listUser?.map((row) => {
					return (
						<Row className="mt-4">
							<Button
								disabled={myusername === row}
								style={{ width: 300 }}
								variant="info"
								onClick={() => handleCall(row)}
							>
								{row === myusername && "ME: "} {row}
							</Button>
						</Row>
					)
				})}

				{/* #videocall */}

				<Row
					className="justify-content-center "
					id="videocall"
				>
					{isStart && (
						<Col
							lg={6}
							md={6}
							id="login"
							// className="invisible"
						>
							<div className=" mt-3 mb-1">
								<Form.Label>Username</Form.Label>
								<Form.Control
									placeholder="Choose a username"
									id="username"
									value={myusername}
									onChange={(e) => {
										setMyUsername(e.target.value)
									}}
								/>
								{registered && (
									<span
										className="badge bg-info"
										id="youok"
									>
										{myusername}
									</span>
								)}
							</div>
							<Button
								id="register"
								variant="success"
								onClick={onRegister}
							>
								Register
							</Button>
						</Col>
					)}

					{/* {isRegister && (
						<Col
							lg={6}
							md={6}
							id="phone"
							// className="invisible"
						>
							<div className=" mt-3 mb-1">
								<Form.Label>Other Username</Form.Label>
								<Form.Control
									placeholder="Who should we call?"
									value={yourUsername}
									onChange={(e) => {
										setYourUsername(e.target.value)
									}}
								/>
							</div>

							{registered && (
								<Button
									variant="success"
									id="call"
									onClick={doCall}
								>
									Call
								</Button>
							)}

							<Button
								variant="danger"
								onClick={doHangup}
							>
								Hung Up
							</Button>
						</Col>
					)} */}
				</Row>

				<Row
					className="mt-4"
					id="videos"
				>
					<Col
						lg={6}
						md={6}
					>
						<Card>
							<Card.Title>Local Stream</Card.Title>
							<Card.Header>
								<ButtonGroup aria-label="Basic example">
									<Button
										variant="danger"
										id="toggleaudio"
									>
										Disable audio
									</Button>
									<Button
										variant="danger"
										id="togglevideo"
									>
										Disable video
									</Button>
									<Dropdown>
										<Dropdown.Toggle
											variant="success"
											id="bitrateset"
										>
											Bandwidth
										</Dropdown.Toggle>

										<Dropdown.Menu>
											<Dropdown.Item href="#">No limit</Dropdown.Item>
											<Dropdown.Item href="#">Cap to 128kbit</Dropdown.Item>
											<Dropdown.Item href="#">Cap to 256kbit</Dropdown.Item>
											<Dropdown.Item href="#">Cap to 512kbit</Dropdown.Item>
											<Dropdown.Item href="#">Cap to 1mbit</Dropdown.Item>
											<Dropdown.Item href="#">Cap to 1.5mbit</Dropdown.Item>
											<Dropdown.Item href="#">Cap to 2mbit</Dropdown.Item>
										</Dropdown.Menu>
									</Dropdown>
								</ButtonGroup>
							</Card.Header>
							<Card.Body>
								<div id="videoleft"></div>
							</Card.Body>
						</Card>
					</Col>

					<Col
						lg={6}
						md={6}
					>
						<Card>
							<Card.Title>Remote Stream</Card.Title>
							<Card.Header>
								<span
									className="badge bg-info hide"
									id="callee"
								></span>
								<span
									className="badge bg-primary hide"
									id="curres"
								></span>
								<span
									className="badge bg-info hide"
									id="curbitrate"
								></span>
							</Card.Header>
							<Card.Body>
								<div id="videoright">
									{isCalling && (
										<div className="text-center">
											<div
												id="spinner"
												className="spinner-border"
												role="status"
											>
												<span className="visually-hidden">Loading...</span>
											</div>
										</div>
									)}
								</div>
							</Card.Body>
						</Card>
					</Col>
				</Row>
			</Container>

			<DialogSimple
				show={dialogcall}
				onClose={onCloseDialogCall}
				title="Incoming call"
				content={<p>"Incoming call from " + {yourUsername} + "!"</p>}
				action={"Answer"}
				onAction={doAnswerCall}
			/>
		</div>
	)
}
