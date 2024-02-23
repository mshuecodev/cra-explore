import React, { useEffect, useRef, useState } from "react"
import { Container, Row, Col } from "react-bootstrap"

import DialogSimple from "../components/Dialog"
// Replace with your own imported variables for iceServers, Janus, and server
import Janus from "../janus"
// const server = "http://172.31.205.114:8088/janus"
// const server = "http://localhost:8088/janus"
const server = "https://webrtc.sedap.app/janus"
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
	const [doSimulcast, setDoSimulcast] = useState(getQueryStringValue("simulcast") === "yes" || getQueryStringValue("simulcast") === "true")
	const [simulcastStarted, setSimulcastStarted] = useState(false)
	const [isStart, setIsStart] = useState(false)
	const [isRegister, setIsRegister] = useState(false)
	const [isLoadingCall, setIsLoadingCall] = useState(false)

	const [myusername, setMyUsername] = useState(null)
	const [yourUsername, setYourUsername] = useState(null)
	const [dialogcall, setDialogCall] = useState(false)

	const [jsepcall, setJsepCall] = useState(false)

	// let videocall = null

	// Handle cleanup when component unmounts
	useEffect(() => {
		return () => {
			if (janus) {
				janus.destroy()
			}
		}
	}, [janus])

	const onCloseDialogCall = () => {
		setDialogCall(false)
	}

	const doCall = () => {
		videocall.createOffer({
			tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true, simulcast: doSimulcast }, { type: "data" }],
			success: function (jsep) {
				console.debug("Got SDP!", jsep)

				Janus.debug("Got SDP!", jsep)
				let body = { request: "call", username: yourUsername }
				videocall.send({ message: body, jsep: jsep })
				// Create a spinner waiting for the remote video
				// $('#videoright').html(
				// 	'<div class="text-center">' +
				// 	'	<div id="spinner" class="spinner-border" role="status">' +
				// 	'		<span class="visually-hidden">Loading...</span>' +
				// 	'	</div>' +
				// 	'</div>');
			},
			error: function (error) {
				console.log("error calling", error)
				alert(error)
			}
		})
	}

	const doHangup = () => {
		// Hangup a call
		// ...
	}

	const onAnswerCall = () => {
		console.log("answer here")
		videocall.createAnswer({
			jsep: jsepcall,
			// We want bidirectional audio and video, if offered,
			// plus data channels too if they were negotiated
			tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true }, { type: "data" }],
			success: function (jsep) {
				console.log("Got SDP!", jsep)
				Janus.debug("Got SDP!", jsep)
				let body = { request: "accept" }
				videocall.send({ message: body, jsep: jsep })
			},
			error: function (error) {
				console.log("WebRTC error:", error)
				Janus.error("WebRTC error:", error)
				alert("WebRTC error... " + error)
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
						janus.attach({
							plugin: "janus.plugin.videocall",
							opaqueId: opaqueId,
							success: function (pluginHandle) {
								// $("#details").remove()

								// videocall = pluginHandle
								setVideocall(pluginHandle)
								console.log("pluginHandle", "Plugin attached! (" + pluginHandle.getPlugin() + ", id=" + pluginHandle.getId() + ")")
								setIsStart(true)
								// Janus.log("Plugin attached! (" + videocall.getPlugin() + ", id=" + videocall.getId() + ")")
								// Prepare the username registration
								// $("#videocall").removeClass("hide")
								// $("#login").removeClass("invisible")
								// $("#registernow").removeClass("hide")
								// $("#register").click(registerUsername)
								// $("#username").focus()
								// $("#start")
								// 	.removeAttr("disabled")
								// 	.html("Stop")
								// 	.click(function () {
								// 		$(this).attr("disabled", true)
								// 		janus.destroy()
								// 	})
							},
							error: function (error) {
								// Janus.error("  -- Error attaching plugin...", error)
								alert("  -- Error attaching plugin... " + error)
							},
							consentDialog: function (on) {
								console.log("Consent dialog should be " + (on ? "on" : "off") + " now")
								Janus.debug("Consent dialog should be " + (on ? "on" : "off") + " now")
								// if (on) {
								// 	// Darken screen and show hint
								// 	$.blockUI({
								// 		message: '<div><img src="up_arrow.png"/></div>',
								// 		baseZ: 3001,
								// 		css: {
								// 			border: "none",
								// 			padding: "15px",
								// 			backgroundColor: "transparent",
								// 			color: "#aaa",
								// 			top: "10px",
								// 			left: "100px"
								// 		}
								// 	})
								// } else {
								// 	// Restore screen
								// 	$.unblockUI()
								// }
							},
							iceState: function (state) {
								console.log("ICE state changed to " + state)
								// Janus.log("ICE state changed to " + state)
							},
							mediaState: function (medium, on, mid) {
								console.log("Janus " + (on ? "started" : "stopped") + " receiving our " + medium + " (mid=" + mid + ")")
								Janus.log("Janus " + (on ? "started" : "stopped") + " receiving our " + medium + " (mid=" + mid + ")")
							},
							webrtcState: function (on) {
								console.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now")
								Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now")
								// $("#videoleft").parent().unblock()
							},
							slowLink: function (uplink, lost, mid) {
								console.warn("Janus reports problems " + (uplink ? "sending" : "receiving") + " packets on mid " + mid + " (" + lost + " lost packets)")
								Janus.warn("Janus reports problems " + (uplink ? "sending" : "receiving") + " packets on mid " + mid + " (" + lost + " lost packets)")
							},
							onmessage: function (msg, jsep) {
								console.log(" ::: Got a message :::", msg)
								Janus.debug(" ::: Got a message :::", msg)
								let result = msg["result"]

								console.log("result onmessage", result)

								if (result) {
									if (result["list"]) {
										let list = result["list"]
										console.log("Got a list of registered peers:", list)
										Janus.debug("Got a list of registered peers:", list)
										for (let mp in list) {
											console.log("  >> [" + list[mp] + "]")
											Janus.debug("  >> [" + list[mp] + "]")
										}
									} else if (result["event"]) {
										let event = result["event"]
										if (event === "registered") {
											// myusername = escapeXmlTags(result["username"])
											// let _myusername = escapeXmlTags(result["username"])
											let _myusername = result["username"]
											setMyUsername(_myusername)
											Janus.log("Successfully registered as " + _myusername + "!")
											// $("#youok")
											// 	.removeClass("hide")
											// 	.html("Registered as '" + myusername + "'")
											// Get a list of available peers, just for fun
											videocall.send({ message: { request: "list" } })
											// Enable buttons to call now
											// $("#phone").removeClass("invisible")
											// $("#call").unbind("click").click(doCall)
											// $("#peer").focus()
										} else if (event === "calling") {
											console.log("Waiting for the peer to answer...")
											Janus.log("Waiting for the peer to answer...")
											// TODO Any ringtone?
											alert("Waiting for the peer to answer...")
										} else if (event === "incomingcall") {
											Janus.log("Incoming call from " + result["username"] + "!")
											// yourusername = escapeXmlTags(result["username"])
											// let _yourusername = escapeXmlTags(result["username"])
											let _yourusername = result["username"]
											setYourUsername(_yourusername)
											console.log("incoming call here", _yourusername)
											setDialogCall(true)
											setJsepCall(jsep)
											// Notify user
											// hideAll()
											// bootbox.dialog({
											// 	message: "Incoming call from " + _yourusername + "!",
											// 	title: "Incoming call",
											// 	closeButton: false,
											// 	buttons: {
											// 		success: {
											// 			label: "Answer",
											// 			className: "btn-success",
											// 			callback: function () {
											// 				// $("#peer").val(result["username"]).attr("disabled", true)
											// 				videocall.createAnswer({
											// 					jsep: jsep,
											// 					// We want bidirectional audio and video, if offered,
											// 					// plus data channels too if they were negotiated
											// 					tracks: [{ type: "audio", capture: true, recv: true }, { type: "video", capture: true, recv: true }, { type: "data" }],
											// 					success: function (jsep) {
											// 						Janus.debug("Got SDP!", jsep)
											// 						let body = { request: "accept" }
											// 						videocall.send({ message: body, jsep: jsep })
											// 						// $("#peer").attr("disabled", true)
											// 						// $("#call").removeAttr("disabled").html("Hangup").removeClass("btn-success").addClass("btn-danger").unbind("click").click(doHangup)
											// 					},
											// 					error: function (error) {
											// 						Janus.error("WebRTC error:", error)
											// 						alert("WebRTC error... " + error.message)
											// 					}
											// 				})
											// 			}
											// 		},
											// 		danger: {
											// 			label: "Decline",
											// 			className: "btn-danger",
											// 			callback: function () {
											// 				doHangup()
											// 			}
											// 		}
											// 	}
											// })
										} else if (event === "accepted") {
											// hideAll()
											let peer = escapeXmlTags(result["username"])
											if (!peer) {
												Janus.log("Call started!")
											} else {
												Janus.log(peer + " accepted the call!")
												// yourusername = peer
												setYourUsername(peer)
											}
											// Video call can start
											if (jsep) videocall.handleRemoteJsep({ jsep: jsep })
											// $("#call").removeAttr("disabled").html("Hangup").removeClass("btn-success").addClass("btn-danger").unbind("click").click(doHangup)
										} else if (event === "update") {
											// An 'update' event may be used to provide renegotiation attempts
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
															Janus.debug("Got SDP!", jsep)
															let body = { request: "set" }
															videocall.send({ message: body, jsep: jsep })
														},
														error: function (error) {
															console.log("WebRTC error:", error)
															Janus.error("WebRTC error:", error)
															alert("WebRTC error... " + error.message)
														}
													})
												}
											}
										} else if (event === "hangup") {
											console.log("Call hung up by " + result["username"] + " (" + result["reason"] + ")!")
											Janus.log("Call hung up by " + result["username"] + " (" + result["reason"] + ")!")
											// Reset status
											// hideAll()
											videocall.hangup()
											// $("#waitingvideo").remove()
											// $("#videos").addClass("hide")
											// $("#peer").removeAttr("disabled").val("")
											// $("#call").removeAttr("disabled").html("Call").removeClass("btn-danger").addClass("btn-success").unbind("click").click(doCall)
											// $("#toggleaudio").attr("disabled", true)
											// $("#togglevideo").attr("disabled", true)
											// $("#bitrate").attr("disabled", true)
											// $("#curbitrate").addClass("hide")
											// $("#curres").addClass("hide")
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
									// FIXME Error?
									let error = msg["error"]
									alert(error)
									if (error.indexOf("already taken") > 0) {
										console.log("error already taken")
										// FIXME Use status codes...
										// $("#username").removeAttr("disabled").val("")
										// $("#register").removeAttr("disabled").unbind("click").click(registerUsername)
									}
									// TODO Reset status
									videocall.hangup()
									// $("#waitingvideo").remove()
									// $("#videos").addClass("hide")
									// $("#peer").removeAttr("disabled").val("")
									// $("#call").removeAttr("disabled").html("Call").removeClass("btn-danger").addClass("btn-success").unbind("click").click(doCall)
									// $("#toggleaudio").attr("disabled", true)
									// $("#togglevideo").attr("disabled", true)
									// $("#bitrate").attr("disabled", true)
									// $("#curbitrate").addClass("hide")
									// $("#curres").addClass("hide")
									if (bitrateTimer) clearInterval(bitrateTimer)
									bitrateTimer = null
								}
							},
							onlocaltrack: function (track, on) {
								console.log("Local track " + (on ? "added" : "removed") + ":", track)
								Janus.debug("Local track " + (on ? "added" : "removed") + ":", track)
								// We use the track ID as name of the element, but it may contain invalid characters
								let trackId = track.id.replace(/[{}]/g, "")
								// if (!on) {
								// 	// Track removed, get rid of the stream and the rendering
								// 	let stream = localTracks[trackId]
								// 	if (stream) {
								// 		try {
								// 			let tracks = stream.getTracks()
								// 			for (let i in tracks) {
								// 				let mst = tracks[i]
								// 				if (mst !== null && mst !== undefined) mst.stop()
								// 			}
								// 		} catch (e) {}
								// 	}
								// 	if (track.kind === "video") {
								// 		$("#myvideo" + trackId).remove()
								// 		localVideos--
								// 		if (localVideos === 0) {
								// 			// No video, at least for now: show a placeholder
								// 			if ($("#videoleft .no-video-container").length === 0) {
								// 				$("#videoleft").append('<div class="no-video-container">' + '<i class="fa-solid fa-video fa-xl no-video-icon"></i>' + '<span class="no-video-text">No webcam available</span>' + "</div>")
								// 			}
								// 		}
								// 	}
								// 	delete localTracks[trackId]
								// 	return
								// }
								// // If we're here, a new track was added
								// let stream = localTracks[trackId]
								// if (stream) {
								// 	// We've been here already
								// 	return
								// }
								// if ($("#videoleft video").length === 0) {
								// 	$("#videos").removeClass("hide")
								// }
								// if (track.kind === "audio") {
								// 	// We ignore local audio tracks, they'd generate echo anyway
								// 	if (localVideos === 0) {
								// 		// No video, at least for now: show a placeholder
								// 		if ($("#videoleft .no-video-container").length === 0) {
								// 			$("#videoleft").append('<div class="no-video-container">' + '<i class="fa-solid fa-video fa-xl no-video-icon"></i>' + '<span class="no-video-text">No webcam available</span>' + "</div>")
								// 		}
								// 	}
								// } else {
								// 	// New video track: create a stream out of it
								// 	localVideos++
								// 	$("#videoleft .no-video-container").remove()
								// 	stream = new MediaStream([track])
								// 	localTracks[trackId] = stream
								// 	Janus.log("Created local stream:", stream)
								// 	$("#videoleft").append('<video class="rounded centered" id="myvideo' + trackId + '" width="100%" height="100%" autoplay playsinline muted="muted"/>')
								// 	Janus.attachMediaStream($("#myvideo" + trackId).get(0), stream)
								// }
								// if (videocall.webrtcStuff.pc.iceConnectionState !== "completed" && videocall.webrtcStuff.pc.iceConnectionState !== "connected") {
								// 	$("#videoleft")
								// 		.parent()
								// 		.block({
								// 			message: "<b>Publishing...</b>",
								// 			css: {
								// 				border: "none",
								// 				backgroundColor: "transparent",
								// 				color: "white"
								// 			}
								// 		})
								// }
							},
							onremotetrack: function (track, mid, on, metadata) {
								console.log("Remote track (mid=" + mid + ") " + (on ? "added" : "removed") + (metadata ? " (" + metadata.reason + ") " : "") + ":", track)
								// Janus.debug("Remote track (mid=" + mid + ") " + (on ? "added" : "removed") + (metadata ? " (" + metadata.reason + ") " : "") + ":", track)

								// if (!on) {
								// 	// Track removed, get rid of the stream and the rendering
								// 	$("#peervideo" + mid).remove()
								// 	if (track.kind === "video") {
								// 		remoteVideos--
								// 		if (remoteVideos === 0) {
								// 			// No video, at least for now: show a placeholder
								// 			if ($("#videoright .no-video-container").length === 0) {
								// 				$("#videoright").append('<div class="no-video-container">' + '<i class="fa-solid fa-video fa-xl no-video-icon"></i>' + '<span class="no-video-text">No remote video available</span>' + "</div>")
								// 			}
								// 		}
								// 	}
								// 	delete remoteTracks[mid]
								// 	return
								// }
								// if ($("#peervideo" + mid).length > 0) return
								// // If we're here, a new track was added
								// $("#spinner").remove()
								// let addButtons = false
								// if ($("#videoright audio").length === 0 && $("#videoright video").length === 0) {
								// 	addButtons = true
								// 	$("#videos").removeClass("hide")
								// }
								// if (track.kind === "audio") {
								// 	// New audio track: create a stream out of it, and use a hidden <audio> element
								// 	let stream = new MediaStream([track])
								// 	remoteTracks[mid] = stream
								// 	Janus.log("Created remote audio stream:", stream)
								// 	$("#videoright").append('<audio class="hide" id="peervideo' + mid + '" autoplay playsinline/>')
								// 	Janus.attachMediaStream($("#peervideo" + mid).get(0), stream)
								// 	if (remoteVideos === 0) {
								// 		// No video, at least for now: show a placeholder
								// 		if ($("#videoright .no-video-container").length === 0) {
								// 			$("#videoright").append('<div class="no-video-container">' + '<i class="fa-solid fa-video fa-xl no-video-icon"></i>' + '<span class="no-video-text">No webcam available</span>' + "</div>")
								// 		}
								// 	}
								// } else {
								// 	// New video track: create a stream out of it
								// 	remoteVideos++
								// 	$("#videoright .no-video-container").remove()
								// 	let stream = new MediaStream([track])
								// 	remoteTracks[mid] = stream
								// 	Janus.log("Created remote video stream:", stream)
								// 	$("#videoright").append('<video class="rounded centered" id="peervideo' + mid + '" width="100%" height="100%" autoplay playsinline/>')
								// 	Janus.attachMediaStream($("#peervideo" + mid).get(0), stream)
								// 	// Note: we'll need this for additional videos too
								// 	if (!bitrateTimer) {
								// 		$("#curbitrate").removeClass("hide")
								// 		bitrateTimer = setInterval(function () {
								// 			if (!$("#peervideo" + mid).get(0)) return
								// 			// Display updated bitrate, if supported
								// 			let bitrate = videocall.getBitrate()
								// 			//~ Janus.debug("Current bitrate is " + videocall.getBitrate());
								// 			$("#curbitrate").text(bitrate)
								// 			// Check if the resolution changed too
								// 			let width = $("#peervideo" + mid).get(0).videoWidth
								// 			let height = $("#peervideo" + mid).get(0).videoHeight
								// 			if (width > 0 && height > 0)
								// 				$("#curres")
								// 					.removeClass("hide")
								// 					.text(width + "x" + height)
								// 					.removeClass("hide")
								// 		}, 1000)
								// 	}
								// }
								// if (!addButtons) return
								// // Enable audio/video buttons and bitrate limiter
								// audioenabled = true
								// videoenabled = true
								// $("#toggleaudio")
								// 	.removeAttr("disabled")
								// 	.click(function () {
								// 		audioenabled = !audioenabled
								// 		if (audioenabled) $("#toggleaudio").html("Disable audio").removeClass("btn-success").addClass("btn-danger")
								// 		else $("#toggleaudio").html("Enable audio").removeClass("btn-danger").addClass("btn-success")
								// 		videocall.send({ message: { request: "set", audio: audioenabled } })
								// 	})
								// $("#togglevideo")
								// 	.removeAttr("disabled")
								// 	.click(function () {
								// 		videoenabled = !videoenabled
								// 		if (videoenabled) $("#togglevideo").html("Disable video").removeClass("btn-success").addClass("btn-danger")
								// 		else $("#togglevideo").html("Enable video").removeClass("btn-danger").addClass("btn-success")
								// 		videocall.send({ message: { request: "set", video: videoenabled } })
								// 	})
								// $("#toggleaudio").parent().removeClass("hide")
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
								// 		$("#bitrateset").text($(this).text()).parent().removeClass("open")
								// 		videocall.send({ message: { request: "set", bitrate: bitrate } })
								// 		return false
								// 	})
							},
							// eslint-disable-next-line no-unused-vars
							ondataopen: function (label, protocol) {
								console.log("The DataChannel is available!")
								// Janus.log("The DataChannel is available!")
								// $("#videos").removeClass("hide")
								// $("#datasend").removeAttr("disabled")
							},
							ondata: function (data) {
								console.log("We got data from the DataChannel!", data)
								// Janus.debug("We got data from the DataChannel!", data)
								// $("#datarecv").val(data)
							},
							oncleanup: function () {
								console.log(" ::: Got a cleanup notification :::")
								// Janus.log(" ::: Got a cleanup notification :::")
								// console.log("oncleanup")
								setMyUsername(null)
								setYourUsername(null)
								setLocalTracks({})
								setLocalVideos(0)
								setRemoteTracks({})
								setRemoteVideos(0)
								setIsRegister(false)
								setIsStart(false)
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

	function checkEnter(field, event) {
		let theCode = event.keyCode ? event.keyCode : event.which ? event.which : event.charCode
		if (theCode == 13) {
			if (field == "username") registerUsername()
			else if (field == "peer") doCall()
			else if (field == "datasend") sendData()
			return false
		} else {
			return true
		}
	}

	const registerUsername = async () => {
		setIsRegister(true)
		try {
			let register = { request: "register", username: myusername }
			await videocall.send({ message: register })
		} catch (error) {
			console.log("registerusername error", error)
		}
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
						{/* <div
							class="container"
							id="details"
						>
							<div class="row">
								<p>
									Press the <code>Start</code> button above to launch the demo.
								</p>
							</div>
						</div> */}
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
												value={myusername}
												onChange={(e) => setMyUsername(e.target.value)}
												class="form-control"
												type="text"
												placeholder="Choose a username"
												autocomplete="off"
												id="username"
												onKeyPress={(event) => checkEnter("username", event)}
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
												value={yourUsername}
												onChange={(e) => setYourUsername(e.target.value)}
												class="form-control"
												type="text"
												placeholder="Who should we call?"
												autocomplete="off"
												id="peer"
												// onkeypress="return checkEnter(this, event);"
											/>
										</div>
										<button
											onClick={doCall}
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
											onKeyPress="return checkEnter(this, event);"
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
										>
											{isLoadingCall && (
												<div class="text-center">
													' +
													<div
														id="spinner"
														class="spinner-border"
														role="status"
													>
														'<span class="visually-hidden">Loading...</span>'
													</div>
													'
												</div>
											)}
										</div>
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

			<DialogSimple
				show={dialogcall}
				onClose={onCloseDialogCall}
				title="Incoming call"
				content={<p>"Incoming call from " + {yourUsername} + "!"</p>}
				action={"Answer"}
				onAction={onAnswerCall}
			/>
		</div>
	)
}

export default VideoCallApp
