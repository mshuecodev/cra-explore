import React from "react"
import ReactDOM from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import "./index.css"
import reportWebVitals from "./reportWebVitals"
import "bootstrap/dist/css/bootstrap.min.css"

// page
import Root from "./routes/root"
import ErrorPage from "./error-page"
import Home from "./routes/home"
import Room from "./routes/room"
import VCall from "./routes/vcall"
import FullVideoCallPage from "./routes/fullVideoCall"
import VideoCallFixed from "./routes/videocallFixed"

const router = createBrowserRouter([
	{
		path: "/",
		element: <Root />,
		errorElement: <ErrorPage />
	},
	{
		path: "home",
		element: <Home />
	},
	{
		path: "room",
		element: <Room />
	},
	{
		path: "vcall",
		element: <FullVideoCallPage />
	},
	{
		path: "vcall2",
		element: <VideoCallFixed />
	}
	// {
	// 	path: "vcall2",
	// 	element: <FullVideoCallPage />
	// }
])

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
