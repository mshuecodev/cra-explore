import React, { useState, useEffect, useRef } from "react"
import { Grid, Card, CardContent, Typography, IconButton, Box, CardActionArea, Button } from "@mui/material"
import Janus from "../janus"
import VolumeUpIcon from "@mui/icons-material/VolumeUp"
import VolumeOffIcon from "@mui/icons-material/VolumeOff"
import VideocamIcon from "@mui/icons-material/Videocam"
import VideocamOffIcon from "@mui/icons-material/VideocamOff"
import CallEndIcon from "@mui/icons-material/CallEnd"
import FullScreenDialog from "../components/FullDialog"

const server = "https://webrtc.sedap.app/janus"
// const server = "https://webrtc.teknologi40.online/janus"
// const server = "http://172.31.205.114:8088/janus"
// const iceServers = [
// 	{
// 		// urls: "stun:stun.l.google.com:19302",
// 		urls: "stun:103.153.60.113:3478",
// 		urls: "turn:103.153.60.113:3478",
// 		username: "sedap",
// 		credential: "sedap00",
// 		urls: "turn:webrtc.sedap.app",
// 	}
// ]
const iceServers = [
	{
		urls: "turn:103.153.60.156:3478",
		username: "sedap",
		credential: "sedap00"
	}
]

const getQueryStringValue = (name) => {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")
	let regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(window.location.search)
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "))
}

export default function FullVideoCallPage() {
	let [janus, setJanus] = useState(null)
	const [videocall, setVideocall] = useState(null)
	const [jsepcall, setJsepCall] = useState(false)
	const [opaqueId, setOpaqueId] = useState("videocalltest-" + Janus.randomString(12))
	const [doSimulcast, setDoSimulcast] = useState(getQueryStringValue("simulcast") === "yes" || getQueryStringValue("simulcast") === "true")

	const [listUser, setListUser] = useState([])
	const [openDialogCall, setOpenDialogCall] = useState(false)
	const [isIncoming, setIncomingCall] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [userToCall, setUsertoCall] = useState(null)
	const [localUser, setLocalUser] = useState(null)

	const [callStarted, setCallStarted] = useState(false)
	const [videoEnabled, setVideoenabled] = useState(false)
	const [audioEnabled, setAudioEnabled] = useState(false)

	function toggleAudio(e) {
		let enable = e
		console.log(enable)
		setAudioEnabled(enable)
		videocall.send({ message: { request: "set", audio: enable } })
	}

	function togglevideo(e) {
		let enable = e
		console.log(enable)
		setAudioEnabled(enable)
		videocall.send({ message: { request: "set", video: enable } })
	}

	function requestListUser(pluginHandle) {
		if (videocall) {
			videocall.send({ message: { request: "list" } })
		} else {
			pluginHandle.send({ message: { request: "list" } })
		}
	}

	function doRegister(pluginHandle) {
		let staticUser = "NAKES"
		let register = { request: "register", username: staticUser }
		setLocalUser(staticUser)

		if (videocall) {
			videocall.send({ message: register })
		} else {
			pluginHandle.send({ message: register })
		}
	}

	function doAnswer() {
		// console.log("vcall", videocall, jsepcall)
		videocall?.createAnswer({
			jsep: jsepcall,
			tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true }, { type: "data" }],
			success: function (jsep) {
				console.log("Answer here Got SDP!", jsep)
				let body = { request: "accept" }
				videocall?.send({ message: body, jsep: jsep })
				setIncomingCall(false)
				setVideoenabled(true)
				setAudioEnabled(true)
			},
			error: function (error) {
				console.log("Answer WebRTC error:", error)
			}
		})
	}

	function doHangup() {
		let hangup = { request: "hangup" }
		videocall.send({ message: hangup })
		videocall.hangup()
		setOpenDialogCall(false)
		setCallStarted(false)
		setVideocall(null)
		window.location.reload()
	}

	function doCall(row) {
		let user = row

		doRegister()
		videocall.createOffer({
			tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true, simulcast: doSimulcast }, { type: "data" }],
			success: function (jsep) {
				console.debug("Got SDP!", jsep)
				setUsertoCall(row)

				setJsepCall(jsep)

				let body = { request: "call", username: user }
				videocall.send({ message: body, jsep: jsep })
				setOpenDialogCall(true)
			},
			error: function (error) {
				console.log("WebRTC error...", error)
				setOpenDialogCall(false)
			}
		})
	}

	function onCloseDialogCall() {
		setOpenDialogCall(false)
	}

	useEffect(() => {
		if (!janus) {
			const initJanus = async () => {
				Janus.init({
					debug: true,
					// dependencies: Janus.UseDefaultDependencies()
					callback: () => {
						if (!Janus.isWebrtcSupported()) {
							alert("No WebRTC support... ")
							return
						}

						let janus = new Janus({
							server: server,
							iceServers: iceServers,
							success: function () {
								let newPlugin = null
								janus.attach({
									plugin: "janus.plugin.videocall",
									opaqueId: opaqueId,
									success: function (pluginHandle) {
										console.log("pluginHandle", "Plugin attached! (" + pluginHandle.getPlugin() + ", id=" + pluginHandle.getId() + ")")

										setVideocall(pluginHandle)
										newPlugin = pluginHandle

										// doRegister(pluginHandle)
										requestListUser(pluginHandle)
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
											let event = result["event"]
											if (event === "registered") {
												let _myusername = result["username"]
												setLocalUser(_myusername)

												newPlugin.send({ message: { request: "list" } })
											} else if (event === "calling") {
												console.log("Waiting for the peer to answer...")
												setIsLoading(true)
											} else if (event === "incomingcall") {
												console.log("Incoming call from " + result["username"] + "!")

												let yourusername = result["username"]
												setUsertoCall(yourusername)
												setIncomingCall(true)
												setJsepCall(jsep)
											} else if (event === "accepted") {
												let peer = result["username"]
												if (!peer) {
													console.log("Call started!")
												} else {
													setUsertoCall(peer)
													console.log(peer + " accepted the call!")
													// setUsertoCall(peer)
												}
												// Video call can start
												setCallStarted(true)
												if (jsep) {
													newPlugin.handleRemoteJsep({ jsep: jsep })
												}
											} else if (event === "hangup") {
												console.log("Call hung up by " + result["username"] + " (" + result["reason"] + ")!")
												newPlugin.hangup()
											}
										} else {
											let error = msg["error"]
											let errCode = msg["error_code"]
											console.log("error here", msg)
											if (errCode === 476) {
												console.log("username already taken!")
											} else {
												newPlugin.hangup()
											}
											// alert(error)
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
										}
									},
									onremotetrack: function (track, mid, on, metadata) {
										console.log("Remote track (mid=" + mid + ") " + (on ? "added" : "removed") + (metadata ? " (" + metadata.reason + ") " : "") + ":", track)
										let remoteTracks = {}
										let remoteVideos = 0

										let peerElement = document.getElementById(`peervideo${mid}`)

										let peerVideo = null
										if (!on) {
											peerVideo = null
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
										setCallStarted(false)

										let addButtons = false
										if (document.querySelectorAll("#videoright audio") === null && document.querySelectorAll("#videoright video") === null) {
											addButtons = true
											setCallStarted(true)
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
											peerVideo = mid
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
												setAudioEnabled(true)
												setVideoenabled(true)
											}
										}
										if (!addButtons) return
									},
									oncleanup: function () {
										setOpenDialogCall(false)
										window.location.reload()
										console.log(" ::: Got a cleanup notification :::")
										// doHangup()
									}
								})
							},
							error: function (error) {
								console.log(error)
								window.location.reload()
							},
							destroyed: function () {
								window.location.reload()
							}
						})
						setJanus(janus)
					}
				})
			}
			initJanus()
		}
	}, [janus])

	return (
		<Grid
			container
			sx={{ overflow: "hidden", maxWidth: "100%" }}
		>
			{isIncoming && (
				<Grid
					item
					sm={12}
					xs={12}
				>
					<Grid
						container
						justifyContent={"center"}
						alignItems={"center"}
						gap={2}
						sx={{ position: "fixed", bottom: 50 }}
					>
						<Button
							variant="contained"
							color="success"
							onClick={doAnswer}
						>
							Answer
						</Button>
						<Button
							variant="contained"
							color="error"
							onClick={doHangup}
						>
							Hang Up
						</Button>
					</Grid>
				</Grid>
			)}
			<Grid
				item
				md={12}
				lg={12}
				xs={12}
			>
				{!openDialogCall && (
					<Grid
						container
						sx={{ m: 2, width: "100%" }}
						gap={2}
					>
						{listUser
							?.filter((y) => y !== localUser)
							.map((x, index) => {
								return (
									<Grid
										key={index}
										item
										md={12}
										sm={12}
										xs={12}
									>
										<Box sx={{ width: "90%" }}>
											<Card
												variant="outlined"
												sx={{ minWidth: "80%" }}
											>
												<CardActionArea
													onClick={() => {
														doCall(x)
													}}
												>
													<CardContent>
														<Typography sx={{ fontWeight: "bold", fontSize: 12 }}>{x}</Typography>
													</CardContent>
												</CardActionArea>
											</Card>
										</Box>
									</Grid>
								)
							})}

						{listUser?.filter((y) => y !== localUser)?.length === 0 && (
							<Grid
								item
								md={12}
								sm={12}
								xs={12}
							>
								<Typography textAlign={"center"}>Tidak ada user aktif.</Typography>
							</Grid>
						)}
					</Grid>
				)}

				<Grid
					sx={{ my: 2 }}
					container
					id="videos"
					flexDirection={"column"}
					// sx={{ height: "100vh" }}
				>
					<Grid
						item
						xs={12}
						// sx={{ flex: 1, height: "100%" }}
					>
						<div id="videoleft"></div>
					</Grid>
					<Grid
						item
						xs={12}
						// sx={{ flex: 1, height: "100%" }}
					>
						<div id="videoright"></div>
					</Grid>
					<Grid
						item
						xs={12}
					>
						<Box>
							{openDialogCall && (
								<Box
									mt={2}
									sx={{ display: "flex", flexDirection: "row", gap: 2, alignItems: "center", justifyContent: "center" }}
								>
									{audioEnabled ? (
										<IconButton
											aria-label="delete"
											id="toggleaudio"
											onClick={() => toggleAudio(false)}
										>
											<VolumeUpIcon />
										</IconButton>
									) : (
										<IconButton
											onClick={() => toggleAudio(true)}
											aria-label="delete"
											id="toggleaudio"
										>
											<VolumeOffIcon />
										</IconButton>
									)}

									{videoEnabled ? (
										<IconButton
											aria-label="delete"
											id="togglevideo"
											onClick={() => {
												togglevideo(false)
											}}
										>
											<VideocamIcon />
										</IconButton>
									) : (
										<IconButton
											aria-label="delete"
											id="togglevideo"
											onClick={() => {
												togglevideo(true)
											}}
										>
											<VideocamOffIcon />
										</IconButton>
									)}

									<IconButton
										aria-label="delete"
										color="error"
										onClick={() => {
											doHangup()
										}}
									>
										<CallEndIcon />
									</IconButton>
								</Box>
							)}
						</Box>
					</Grid>
				</Grid>
				{/* <FullScreenDialog
				open={openDialogCall}
				title={userToCall}
				handleClose={onCloseDialogCall}
				content={
					<>
						<Grid
							container
							id="videos"
						>
							<Grid xs={12}>
								<div id="videoleft"></div>
							</Grid>
							<Grid xs={12}>
								<div id="videoright"></div>
							</Grid>
						</Grid>
					</>
				}
			/> */}
			</Grid>
		</Grid>
	)
}
