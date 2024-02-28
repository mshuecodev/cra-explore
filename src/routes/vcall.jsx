import React, { useEffect, useRef, useState } from "react"
import { Button, Container, Row, Col, Form, Card, ButtonGroup, Dropdown } from "react-bootstrap"
import Janus from "../janus"
import DialogSimple from "../components/Dialog"

const server = "https://webrtc.sedap.app/janus"
// const server = "http://172.31.205.114:8088/janus"
const iceServers = [{ urls: "stun:stun.l.google.com:19302" }]
// const iceServers = []

const VideoCall = () => {
	const localVideoRef = useRef(null)
	const remoteVideoRef = useRef(null)
	const audioRightRef = useRef(null)

	const [opaqueId, setOpaqueId] = useState("videocalltest-" + Janus.randomString(12))

	const [videocall, setVideocall] = useState(null)
	const [janus, setJanus] = useState(null)

	const [localTracks, setLocalTracks] = useState({})
	const [localVideos, setLocalVideos] = useState(0)

	const [remoteTracks, setRemoteTracks] = useState({})
	const [remoteVideos, setRemoteVideos] = useState(0)

	const [bitrateTimer, setBitrateTimer] = useState(null)

	const [audioenabled, setAudioenabled] = useState(false)
	const [videoenabled, setVideoenabled] = useState(false)

	const [myusername, setMyUsername] = useState(null)
	const [yourUsername, setYourUsername] = useState(null)

	const [doSimulcast, setDoSimulcast] = useState(getQueryStringValue("simulcast") === "yes" || getQueryStringValue("simulcast") === "true")
	const [simulcastStarted, setSimulcastStarted] = useState(false)

	const [dialogcall, setDialogCall] = useState(false)

	const [videoID, setVideoID] = useState(false)
	const [videocallID, setVideocallID] = useState(false)
	const [loginID, setLoginID] = useState(false)
	const [phoneID, setPhoneID] = useState(false)
	const [callID, setCallID] = useState(false)
	const [myVideoID, setMyVideoID] = useState(false)
	const [noVideoLocal, setNoVideoLocal] = useState(true)
	const [noVideoRemote, setNoVideoRemote] = useState(true)

	const [isCalling, setIsCalling] = useState(false)
	const [isPublishing, setIsPublishing] = useState(false)

	const [jsepCall, setJsep] = useState(false)

	const onCloseDialogCall = () => {
		setDialogCall(false)
		// doHangup()
	}

	useEffect(() => {
		return () => {
			if (janus) {
				janus.destroy()
			}
		}
	}, [janus])

	const registerUsername = async () => {
		try {
			let register = { request: "register", username: myusername }
			await videocall.send({ message: register })
		} catch (error) {
			console.log("err register", error)
		}
	}

	const doAnswerCall = () => {
		videocall.createAnswer({
			jsep: jsepCall,
			// We want bidirectional audio and video, if offered,
			// plus data channels too if they were negotiated
			tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true }, { type: "data" }],
			success: function (jsep) {
				console.log("Got SDP!", jsep)
				let body = { request: "accept" }
				videocall.send({ message: body, jsep: jsep })
				setCallID(true)
				setDialogCall(false)
			},
			error: function (error) {
				console.log("WebRTC error:", error)
				setDialogCall(false)
			}
		})
	}

	function doCall() {
		// Call someone
		setCallID(false)

		// Call this user
		videocall.createOffer({
			// We want bidirectional audio and video, plus data channels
			tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true, simulcast: doSimulcast }, { type: "data" }],
			success: function (jsep) {
				console.log("Got SDP!", jsep)
				let body = { request: "call", username: yourUsername }
				videocall.send({ message: body, jsep: jsep })
				// Create a spinner waiting for the remote video
				setIsCalling(true)
			},
			error: function (error) {
				console.log("WebRTC error...", error)
				alert("WebRTC error... " + error.message)
			}
		})
	}

	function doHangup() {
		// Hangup a call
		setCallID(false)
		let hangup = { request: "hangup" }
		videocall.send({ message: hangup })
		videocall.hangup()
		setYourUsername(null)
	}

	function addSimulcastButtons() {}

	function updateSimulcastButtons() {}

	const onStart = () => {
		if (!Janus.isWebrtcSupported()) {
			alert("No WebRTC support... ")
			return
		}

		// create session
		let janus = new Janus({
			server,
			iceServers,
			success: function () {
				// attach to videocall plugin
				janus.attach({
					plugin: "janus.plugin.videocall",
					opaqueId: opaqueId,
					success: function (pluginHandle) {
						setVideocall(pluginHandle)
						setVideocallID(true)
						setLoginID(true)
						console.log("Plugin attached! (" + pluginHandle.getPlugin() + ", id=" + pluginHandle.getId() + ")")
					},
					error: function (error) {
						console.log("  -- Error attaching plugin...", error)
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
								console.log("Got a list of registered peers:", list)
								for (let mp in list) {
									Janus.debug("  >> [" + list[mp] + "]")
								}
							} else if (result["event"]) {
								let event = result["event"]
								if (event === "registered") {
									let _myusername = result["username"]
									console.log("Successfully registered as " + _myusername + "!")
									setMyUsername(_myusername)
									setPhoneID(true)
									videocall.send({ message: { request: "list" } })
								} else if (event === "calling") {
									console.log("Waiting for the peer to answer...")
									// TODO Any ringtone?
									// alert("Waiting for the peer to answer...")
								} else if (event === "incomingcall") {
									console.log("Incoming call from " + result["username"] + "!")
									let _yourusername = result["username"]
									setYourUsername(_yourusername)
									setDialogCall(true)
									setJsep(jsep)
								} else if (event === "accepted") {
									let peer = result["username"]
									if (!peer) {
										console.log("Call started!")
									} else {
										console.log(peer + " accepted the call!")
										setYourUsername(peer)
									}

									if (jsep) {
										videocall.handleRemoteJsep({
											jsep: jsep,
											success: function (jsep) {
												console.log("accpeted here", jsep)
											}
										})
									}
								} else if (event === "update") {
									if (jsep) {
										if (jsep.type === "answer") {
											videocall.handleRemoteJsep({ jsep: jsep })
										} else {
											videocall.createAnswer({
												jsep: jsep,
												// We want bidirectional audio and video, if offered,
												// plus data channels too if they were negotiated
												tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true }, { type: "data" }],
												success: function (jsep) {
													console.log("Got SDP!", jsep)
													let body = { request: "set" }
													videocall.send({ message: body, jsep: jsep })
												},
												error: function (error) {
													console.log("WebRTC error:", error)
													alert("WebRTC error... " + error.message)
												}
											})
										}
									}
								} else if (event === "hangup") {
									console.log("Call hung up by " + result["username"] + " (" + result["reason"] + ")!")
									videocall.hangup()
									setVideoID(false)
								} else if (event === "simulcast") {
									// Is simulcast in place?
									let substream = result["substream"]
									let temporal = result["temporal"]
									if ((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
										if (!simulcastStarted) {
											simulcastStarted = true
											addSimulcastButtons(result["videocodec"] === "vp8")
										}
										// We just received notice that there's been a switch, update the buttons
										updateSimulcastButtons(substream, temporal)
									}
								}
							}
						} else {
							let error = msg["error"]
							console.log("error result", error)
							alert(error)
							if (error.indexOf("already taken") > 0) {
								// FIXME Use status codes...
								setLoginID(true)
							}
							videocall.hangup()
							if (bitrateTimer) clearInterval(bitrateTimer)
							bitrateTimer = null
						}
					},
					onlocalstream: function (track, on) {
						console.log("Local track " + (on ? "added" : "removed") + ":", track)
						setVideoID(true)
						let trackId = track.id.replace(/[{}]/g, "")

						if (!on) {
							console.log("not on")
							// Track removed, get rid of the stream and the rendering
							// let stream = localTracks[trackId]

							let stream = trackId
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
								// $("#myvideo" + trackId).remove()
								setMyVideoID(false)
								setLocalVideos((prevLocalVideos) => prevLocalVideos - 1)

								// localVideos--
								let prevLocalVideos = localVideos - 1
								if (prevLocalVideos === 0) {
									// No video, at least for now: show a placeholder
									const noVideoContainer = document.querySelector("#videoleft .no-video-container")
									console.log("noVideoContainer", noVideoContainer)
									if (noVideoContainer) {
										setNoVideoLocal(true)
									}
								}
							}
							setLocalTracks({})
							// delete localTracks[trackId]
							return
						}

						setLocalTracks({ trackId })

						// If we're here, a new track was added
						// let stream = localTracks[trackId]
						let stream = trackId
						if (stream) {
							// We've been here already
							return
						}

						const videoElement = document.querySelector("#videoleft video")
						if (videoElement) {
							// $("#videos").removeClass("hide")
							setNoVideoLocal(false)
						}

						if (track.kind === "audio") {
							// We ignore local audio tracks, they'd generate echo anyway
							if (localVideos === 0) {
								// No video, at least for now: show a placeholder
								const noVideoContainer = document.querySelector("#videoleft .no-video-container")

								if (noVideoContainer) {
									setNoVideoLocal(true)
								}
							}
						} else {
							// New video track: create a stream out of it
							setLocalVideos((prevLocalVideos) => prevLocalVideos + 1)
							let prevLocalVideos = localVideos + 1
							setNoVideoLocal(false)
							stream = new MediaStream([track])
							setLocalTracks({ trackId: stream })
							console.log("Created local stream:", stream)

							Janus.attachMediaStream(localVideoRef.current, stream)
						}

						if (videocall.webrtcStuff.pc.iceConnectionState !== "completed" && videocall.webrtcStuff.pc.iceConnectionState !== "connected") {
							setIsPublishing(true)
						}
					},
					onremotestream: function (track, mid, on, metadata) {
						console.log("Remote track (mid=" + mid + ") " + (on ? "added" : "removed") + (metadata ? " (" + metadata.reason + ") " : "") + ":", track)

						if (!on) {
							if (track.kind === "video") {
								// remoteVideos--
								setRemoteVideos((prevRemoteVideos) => prevRemoteVideos - 1)
								if (remoteVideos === 0) {
									// No video, at least for now: show a placeholder
									const noVideoContainer = document.querySelector("#videoright .no-video-container")
									if (noVideoContainer) {
										setNoVideoRemote(true)
									}
								}
							}
							// delete remoteTracks[mid]
							setRemoteTracks({})
							return
						}
						// if ($("#peervideo" + mid).length > 0) return
						// If we're here, a new track was added
						// $("#spinner").remove()
						setRemoteTracks({ mid })
						setIsCalling(false)
						let addButtons = false
						const audioElement = document.querySelector("#videoright audio")
						const videoElement = document.querySelector("#videoright video")
						if (audioElement && videoElement) {
							addButtons = true
							// $("#videos").removeClass("hide")
							setNoVideoRemote(false)
						}

						if (track.kind === "audio") {
							// New audio track: create a stream out of it, and use a hidden <audio> element
							let stream = new MediaStream([track])
							setRemoteTracks({ mid: stream })
							// remoteTracks[mid] = stream
							Janus.log("Created remote audio stream:", stream)
							// $("#videoright").append('<audio class="hide" id="peervideo' + mid + '" autoplay playsinline/>')
							Janus.attachMediaStream(audioRightRef.current, stream)
							if (remoteVideos === 0) {
								// No video, at least for now: show a placeholder
								const noVideoContainer = document.querySelector("#videoright .no-video-container")
								if (noVideoContainer) {
									setNoVideoRemote(true)
									// $("#videoright").append('<div class="no-video-container">' + '<i class="fa-solid fa-video fa-xl no-video-icon"></i>' + '<span class="no-video-text">No webcam available</span>' + "</div>")
								}
							}
						} else {
							// New video track: create a stream out of it
							// remoteVideos++
							setRemoteVideos((prevRemoteVideos) => prevRemoteVideos + 1)
							// $("#videoright .no-video-container").remove()
							setNoVideoRemote(false)
							let stream = new MediaStream([track])
							// remoteTracks[mid] = stream
							setRemoteTracks({ mid: stream })
							console.log("Created remote video stream:", stream)
							// $("#videoright").append('<video class="rounded centered" id="peervideo' + mid + '" width="100%" height="100%" autoplay playsinline/>')
							Janus.attachMediaStream(remoteVideoRef.current, stream)
							// Note: we'll need this for additional videos too
							if (!bitrateTimer) {
								console.log(" bitrateTimer false")
								// $("#curbitrate").removeClass("hide")
								// bitrateTimer = setInterval(function () {
								// 	if (!$("#peervideo" + mid).get(0)) return
								// 	// Display updated bitrate, if supported
								// 	let bitrate = videocall.getBitrate()
								// 	//~ Janus.debug("Current bitrate is " + videocall.getBitrate());
								// 	$("#curbitrate").text(bitrate)
								// 	// Check if the resolution changed too
								// 	let width = $("#peervideo" + mid).get(0).videoWidth
								// 	let height = $("#peervideo" + mid).get(0).videoHeight
								// 	if (width > 0 && height > 0)
								// 		$("#curres")
								// 			.removeClass("hide")
								// 			.text(width + "x" + height)
								// 			.removeClass("hide")
								// }, 1000)
							}
						}
					},
					oncleanup: function () {
						console.log(" ::: Got a cleanup notification :::")
						// $("#videoleft").empty().parent().unblock()
						// $("#videoright").empty()
						// $("#callee").empty().addClass("hide")
						// yourusername = null
						// $("#curbitrate").addClass("hide")
						// $("#curres").addClass("hide")
						// $("#videos").addClass("hide")
						// $("#toggleaudio").attr("disabled", true)
						// $("#togglevideo").attr("disabled", true)
						// $("#bitrate").attr("disabled", true)
						// $("#curbitrate").addClass("hide")
						// $("#curres").addClass("hide")
						// if (bitrateTimer) clearInterval(bitrateTimer)
						// bitrateTimer = null
						// $("#videos").addClass("hide")
						// simulcastStarted = false
						// $("#simulcast").remove()
						// $("#peer").removeAttr("disabled").val("")
						// $("#call").removeAttr("disabled").html("Call").removeClass("btn-danger").addClass("btn-success").unbind("click").click(doCall)
						// localTracks = {}
						// localVideos = 0
						// remoteTracks = {}
						// remoteVideos = 0
					}
				})
			},
			error: function (error) {
				Janus.error(error)
				alert(error)
				doHangup()
				window.location.reload()
			},
			destroyed: function () {
				doHangup()
				window.location.reload()
			}
		})

		setJanus(janus)
	}

	const handleStart = () => {
		Janus.init({
			debug: true,
			callback: function () {
				// start button
				onStart()
			}
		})
	}

	// console.log("janus", janus)

	return (
		<div style={{ width: "100%" }}>
			<Container fluid="lg">
				<Row className="justify-content-center ">
					<Col
						lg={12}
						className="pb-2 mt-4 mb-2 "
					>
						<Button
							variant={videocallID ? "danger" : "primary"}
							onClick={() => {
								if (videocallID) {
								} else {
									handleStart()
								}
							}}
						>
							{videocallID ? "Stop" : "Start"}
						</Button>
					</Col>
				</Row>
				{videocallID && (
					<Row
						className="justify-content-center "
						id="videocall"
					>
						{loginID && (
							<Col
								lg={6}
								md={6}
								id="login"
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
									{myusername && (
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
									onClick={registerUsername}
								>
									Register
								</Button>
							</Col>
						)}

						{phoneID && (
							<Col
								lg={6}
								md={6}
								id="phone"
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
								<Button
									variant={callID ? "danger" : "success"}
									id="call"
									onClick={() => {
										if (callID) {
											doHangup()
										} else {
											doCall()
										}
									}}
								>
									{callID ? "Hung Up" : "Call"}
								</Button>
							</Col>
						)}
					</Row>
				)}

				{videoID && (
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
										<Button variant="danger">Disable audio</Button>
										<Button variant="danger">Disable video</Button>
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
										{isPublishing && (
											<b
												style={{
													border: "none",
													backgroundColor: "transparent",
													color: "white"
												}}
											>
												Publishing...
											</b>
										)}

										{noVideoLocal && (
											<div className="no-video-container">
												<i className="fa-solid fa-video fa-xl no-video-icon"></i>
												<span className="no-video-text">No webcam available</span>
											</div>
										)}

										{localTracks?.trackId && (
											<video
												ref={localVideoRef}
												class="rounded centered"
												id={"myvideo" + localTracks?.trackId}
												width="100%"
												height="100%"
												autoplay
												playsinline
												muted="muted"
											/>
										)}
									</div>
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
										{noVideoRemote && (
											<div class="no-video-container">
												<i class="fa-solid fa-video fa-xl no-video-icon"></i>
												<span class="no-video-text">No remote video available</span>
											</div>
										)}
										{remoteTracks?.mid && (
											<>
												<audio
													ref={audioRightRef}
													class="hide"
													id={"peervideo" + remoteTracks?.mid}
													autoplay
													playsinline
												/>

												<video
													ref={remoteVideoRef}
													class="rounded centered"
													id={"peervideo" + remoteTracks?.mid}
													width="100%"
													height="100%"
													autoplay
													playsinline
												/>
											</>
										)}
									</div>
								</Card.Body>
							</Card>
						</Col>
					</Row>
				)}
			</Container>

			{/* <video
				ref={localVideoRef}
				autoPlay
				playsInline
				muted
			/>
			<video
				ref={remoteVideoRef}
				autoPlay
				playsInline
			/> */}

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

export default VideoCall

const getQueryStringValue = (name) => {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")
	let regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(window.location.search)
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "))
}
