import React from "react"

const VerifyZoom = () => {
	return (
		<iframe
			title="Verify Zoom"
			src={`${process.env.PUBLIC_URL}/verifyzoom.html`}
			style={{ display: "none" }}
		/>
	)
}

export default VerifyZoom
