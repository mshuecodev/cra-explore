import React, { useRef, useState, useEffect } from "react"
import { Button, Container, Row, Col, Form, Card, ButtonGroup, Dropdown } from "react-bootstrap"
import Janus from "../janus"
import DialogSimple from "../components/Dialog"

const server = "https://webrtc.sedap.app/janus"
const iceServers = [{ urls: "stun:stun.l.google.com:19302" }]

const getQueryStringValue = (name) => {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")
	let regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(window.location.search)
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "))
}

function VideoCallFixed() {
	const videoLeftRef = useRef(null)
	const videoRightRef = useRef(null)

	const [janus, setJanus] = useState(null)
	const [videocall, setVideocall] = useState(null)
	const [opaqueId, setOpaqueId] = useState("videocalltest-" + Janus.randomString(12))

	const [doSimulcast, setDoSimulcast] = useState(getQueryStringValue("simulcast") === "yes" || getQueryStringValue("simulcast") === "true")

	const [myusername, setMyUsername] = useState(null)
	const [yourUsername, setYourUsername] = useState(null)

	const [startSession, setStartSession] = useState(false)
	const [isRegistered, setIsRegistered] = useState(false)
	const [isCalling, setIsCalling] = useState(false)
	const [isAnswer, setAnswer] = useState(false)
	const [dialogcall, setDialogCall] = useState(false)
	const [isNoVideo, setNoVideo] = useState(false)
	const [openLeftVideo, setOpenLeftVideo] = useState(false)
	const [publishing, setPublishing] = useState(false)

	const [openRightVideo, setOpenRightVideo] = useState(false)

	const [trackID, setTrackID] = useState(null)

	const [jsepCall, setJsepCall] = useState(null)

	function onRegister() {
		let register = { request: "register", username: myusername }
		videocall.send({ message: register })
		setIsRegistered(true)
	}

	function doCall() {
		videocall.createOffer({
			// We want bidirectional audio and video, plus data channels
			tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true, simulcast: doSimulcast }, { type: "data" }],
			success: function (jsep) {
				console.log("Got SDP!", jsep)
				setJsepCall(jsep)
				let body = { request: "call", username: yourUsername }
				videocall.send({ message: body, jsep: jsep })
				setIsCalling(true)
				// Create a spinner waiting for the remote video
				// $("#videoright").html('<div class="text-center">' + '	<div id="spinner" class="spinner-border" role="status">' + '		<span class="visually-hidden">Loading...</span>' + "	</div>" + "</div>")
			},
			error: function (error) {
				console.log("WebRTC error...", error)
			}
		})
	}

	function doAnswerCall() {
		videocall.createAnswer({
			jsep: jsepCall,
			// We want bidirectional audio and video, if offered,
			// plus data channels too if they were negotiated
			tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true }, { type: "data" }],
			success: function (jsep) {
				console.log("Got SDP!", jsep)
				setJsepCall(jsep)
				let body = { request: "accept" }
				videocall.send({ message: body, jsep: jsep })
				setAnswer(true)
				setDialogCall(false)
			},
			error: function (error) {
				console.log("WebRTC error:", error)
			}
		})
	}

	function doHangup() {}

	function onCloseDialogCall() {
		setDialogCall(false)
		doHangup()
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

								setStartSession(true)
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
											let _myusername = result["username"]
											setMyUsername(_myusername)
											Janus.log("Successfully registered as " + _myusername + "!")

											setIsRegistered(true)

											newPlugin.send({ message: { request: "list" } })
										} else if (event === "calling") {
											console.log("Waiting for the peer to answer...")
											// TODO Any ringtone?
											alert("Waiting for the peer to answer...")
										} else if (event === "incomingcall") {
											console.log("Incoming call from " + result["username"] + "!")
											let _yourusername = result["username"]
											setJsepCall(jsep)
											setYourUsername(_yourusername)
											setDialogCall(true)
										} else if (event === "accepted") {
											let peer = result["username"]
											if (!peer) {
												console.log("Call started!")
											} else {
												console.log(peer + " accepted the call!")
												let _yourusername = peer
												setYourUsername(_yourusername)
											}
											// Video call can start
											if (jsepCall) {
												newPlugin.handleRemoteJsep({ jsep: jsepCall })
											}
										}
									}
								} else {
									let error = msg["error"]
									alert(error)
									newPlugin.hangup()
								}
							},
							onlocaltrack: function (track, on) {
								console.log("Local track " + (on ? "added" : "removed") + ":", track)

								let localTracks = {}
								let localVideos = 0

								let trackId = track.id.replace(/[{}]/g, "")
								setTrackID(trackId)
								if (!on) {
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
										localVideos--
										if (localVideos === 0) {
											setNoVideo(true)
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

								setOpenLeftVideo(true)

								if (track.kind === "audio") {
									// We ignore local audio tracks, they'd generate echo anyway
									if (localVideos === 0) {
										setNoVideo(true)
										// No video, at least for now: show a placeholder
										// if ($("#videoleft .no-video-container").length === 0) {
										// 	$("#videoleft").append('<div class="no-video-container">' + '<i class="fa-solid fa-video fa-xl no-video-icon"></i>' + '<span class="no-video-text">No webcam available</span>' + "</div>")
										// }
									} else {
										// New video track: create a stream out of it
										localVideos++
										// $("#videoleft .no-video-container").remove()
										setNoVideo(false)
										setOpenLeftVideo(true)

										stream = new MediaStream([track])
										localTracks[trackId] = stream
										console.log("Created local stream:", stream)
										Janus.log("Created local stream:", stream)
										// $("#videoleft").append('<video class="rounded centered" id="myvideo' + trackId + '" width="100%" height="100%" autoplay playsinline muted="muted"/>')
										Janus.attachMediaStream(videoLeftRef.current, stream)
									}

									if (newPlugin.webrtcStuff.pc.iceConnectionState !== "completed" && newPlugin.webrtcStuff.pc.iceConnectionState !== "connected") {
										setPublishing(true)
										// $("#videoleft")
										//     .parent()
										//     .block({
										//         message: "<b>Publishing...</b>",
										//         css: {
										//             border: "none",
										//             backgroundColor: "transparent",
										//             color: "white"
										//         }
										//     })
									}
								}
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
			}
		})
	}

	useEffect(() => {
		handleStart()
		return () => {
			if (janus) {
				janus.destroy()
			}
		}
	}, [janus])

	return (
		<div style={{ width: "100%", marginTop: 50, marginBottom: 20 }}>
			<Container fluid="lg">
				{/* <Row className="justify-content-center ">
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
					</Row> */}

				<Row
					id="videocall"
					className="justify-content-center"
				>
					<Col
						md={6}
						id="login"
					>
						<div className="mt-3 mb-1">
							<Form.Control
								size="lg"
								type="text"
								placeholder="My Username"
								id="username"
								value={myusername}
								onChange={(e) => {
									setMyUsername(e.target.value)
								}}
							/>

							{isRegistered && (
								<span
									className="badge bg-info"
									id="youok"
								>
									{myusername}
								</span>
							)}
						</div>
						<Button
							variant="primary"
							id="register"
							onClick={onRegister}
						>
							Register
						</Button>
					</Col>

					{isRegistered && (
						<Col
							md={6}
							id="phone"
						>
							<div className="mt-3 mb-1">
								<Form.Control
									id="peer"
									size="lg"
									type="text"
									placeholder="Choose a username"
									value={yourUsername}
									onChange={(e) => {
										setYourUsername(e.target.value)
									}}
								/>
							</div>
							{isAnswer && (
								<Button
									variant="success"
									id="call"
									onClick={doHangup}
								>
									Call
								</Button>
							)}

							{!isAnswer && (
								<Button
									variant="success"
									id="call"
									onClick={doCall}
								>
									Call
								</Button>
							)}
						</Col>
					)}
				</Row>

				<Row
					className="mt-4"
					id="videos"
				>
					{openLeftVideo && (
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
									<div id="videoleft">
										{publishing && (
											<div style={{ border: "none", backgroundColor: "transparent", color: "white" }}>
												<b>Publishing...</b>
											</div>
										)}
										{openLeftVideo && (
											<video
												ref={videoLeftRef}
												className="rounded centered"
												id={`myvideo${trackID}`}
												width="100%"
												height="100%"
												autoPlay
												playsInline
												muted="muted"
											/>
										)}
										{isNoVideo && (
											<div className="no-video-container">
												<i className="fa-solid fa-video fa-xl no-video-icon">
													<span className="no-video-text">No webcam available</span>
												</i>
											</div>
										)}
									</div>
								</Card.Body>
							</Card>
						</Col>
					)}

					{openRightVideo && (
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
					)}
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

export default VideoCallFixed
