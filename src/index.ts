import bcrypt from 'bcrypt'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import session, {Session, SessionData} from 'express-session'
import path from 'path'
import {db} from '~/lib/db'
import config from '~/lib/env'
import {deleteS3Object, getS3SignedUrl} from '~/lib/s3'
import {sendEmail} from '~/lib/ses'

interface ExtendedSession extends Session {
	userId?: string
}

const app = express()

app.use(cors())
app.use(cookieParser())
app.use(
	session({
		secret: config.session_secret,
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 60 * 60 * 1000,
		},
	})
)
app.use((req, _, next) => {
	req.session as ExtendedSession
	next()
})

const port = config.port

app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(express.static(path.join(__dirname, 'static')))

const authMiddleware = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction
) => {
	const reqSession = req.session as Session &
		Partial<SessionData> &
		ExtendedSession

	if (reqSession && reqSession.userId) {
		next()
	} else {
		res.redirect('/login')
	}
}

app.get('/', authMiddleware, function (_, res) {
	res.sendFile(path.join(__dirname, 'static', 'file-upload.html'))
})

app.get('/login', function (_, res) {
	res.sendFile(path.join(__dirname, 'static', 'login.html'))
})

app.post('/auth/login', async function (req, res) {
	const {email, password} = req.body

	const user = await db.user.findUnique({
		where: {
			email,
		},
	})

	if (!user) {
		return res
			.status(400)
			.json({success: false, emailError: 'No user found with this email'})
	}

	const isValid = await bcrypt.compare(password, user.password)

	if (!isValid) {
		return res
			.status(400)
			.json({success: false, passwordError: 'Invalid password'})
	}

	const reqSession = req.session as Session &
		Partial<SessionData> &
		ExtendedSession
	reqSession.userId = user.id
	res.status(200).json({success: true})
})

app.post('/auth/logout', function (req, res) {
	const reqSession = req.session as Session &
		Partial<SessionData> &
		ExtendedSession
	reqSession.userId = undefined
	res.status(200).json({
		success: true,
	})
})

app.get('/s3/getPresignedUrl', async function (req, res) {
	const {key} = req.query
	if (!key) return res.status(400).json({error: 'No key provided'})

	const encodedKey = encodeURIComponent(key as string)
	const signedUrl = await getS3SignedUrl(encodedKey)

	return res.status(200).json({url: signedUrl})
})

app.post('/create-file', async function (req, res) {
	const userId = (req.session as ExtendedSession).userId

	const url = req.body.url as string | undefined
	let emails = req.body.emails as string[] | undefined

	if (!userId) {
		return res.status(400).json({error: 'No user found'})
	}

	if (!emails || emails.length === 0) {
		return res.status(400).json({error: 'No email provided'})
	}

	if (!url) {
		return res.status(400).json({error: 'No url provided'})
	}

	const recipients = emails.map(email => ({
		email,
		token: Math.random().toString(36).slice(2),
	}))

	await db.file.create({
		data: {
			url,
			userId,
			recipients: {
				createMany: {
					data: recipients,
				},
			},
		},
	})

	for (const recepient of recipients) {
		await sendEmail({
			to: recepient.email,
			subject: `New file!`,
			text: `${config.server_url}/access-file?token=${recepient.token}`,
			html: `<a href="${config.server_url}/access-file?token=${recepient.token}">this link</a>`,
		})

		await new Promise(resolve => setTimeout(resolve, 1000))
	}
})

app.get('/access-file', async function (req, res) {
	const {token} = req.query as {token?: string}

	if (!token) {
		return res.status(400).json({error: 'No token provided'})
	}

	const recepient = await db.recipient.findFirst({
		where: {
			token,
		},
		include: {
			file: {
				include: {
					recipients: true,
					_count: true,
				},
			},
		},
	})

	if (!recepient) {
		return res.status(400).json({error: 'No recipients found'})
	}

	const accessedByAll =
		recepient.file._count.recipients ===
		recepient.file.recipients.filter(r => r.clicked).length

	if (accessedByAll) {
		deleteS3Object({
			key: recepient.file.url.split('/').pop()!,
			bucket: config.bucket_name,
		})

		return res.status(400).json({error: 'File has been deleted'})
	}

	await db.recipient.update({
		where: {
			email_fileId: {
				email: recepient.email,
				fileId: recepient.fileId,
			},
		},
		data: {
			clicked: true,
		},
	})

	return res.redirect(recepient.file.url)
})

app.get('*', function (_, res) {
	res.status(404).send('404 Not Found')
})

app.listen(port, () => {
	console.log(
		`Server is listening on port ${port}\nYou can access via http://localhost:${port}/`
	)
})
