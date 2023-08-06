import * as dotenv from 'dotenv'
dotenv.config()

const config: {
	port: number
	session_secret: string
	aws_access_key_id: string
	aws_secret_access_key: string
	bucket_name: string
	region: string
	server_url: string
} = {
	port: Number(process.env.PORT) ?? 8080,
	aws_access_key_id: process.env.AWS_ACCESS_KEY_ID ?? ' ',
	aws_secret_access_key: process.env.AWS_SECRET_ACCESS_KEY ?? '',
	bucket_name: process.env.AWS_BUCKET ?? '',
	region: process.env.AWS_REGION ?? '',
	session_secret: process.env.SESSION_SECRET ?? '',
	server_url: process.env.SERVER_URL ?? '',
}

export default config
