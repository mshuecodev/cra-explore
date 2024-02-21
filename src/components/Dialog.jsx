import Button from "react-bootstrap/Button"
import Modal from "react-bootstrap/Modal"

function DialogSimple({ show, title, content, onClose, action, onAction }) {
	return (
		<div
			className="modal show"
			style={{ display: "block", position: "initial" }}
		>
			<Modal.Dialog
				show={show}
				onHide={onClose}
			>
				<Modal.Header closeButton>
					<Modal.Title>{title}</Modal.Title>
				</Modal.Header>

				<Modal.Body>{content}</Modal.Body>

				<Modal.Footer>
					<Button
						variant="secondary"
						onclick={onClose}
					>
						Close
					</Button>
					<Button
						variant="primary"
						onclick={onAction}
					>
						{action}
					</Button>
				</Modal.Footer>
			</Modal.Dialog>
		</div>
	)
}

export default DialogSimple
