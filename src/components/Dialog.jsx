import Button from "react-bootstrap/Button"
import Modal from "react-bootstrap/Modal"

function DialogSimple({ show, title, content, onClose, action, onAction }) {
	return (
		<div
			className="modal show"
			style={{ display: "block", position: "initial" }}
		>
			<Modal
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
						onClick={onClose}
					>
						Close
					</Button>
					<Button
						variant="primary"
						onClick={onAction}
					>
						{action}
					</Button>
				</Modal.Footer>
			</Modal>
		</div>
	)
}

export default DialogSimple
