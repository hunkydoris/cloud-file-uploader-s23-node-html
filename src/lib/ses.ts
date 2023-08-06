import axios from 'axios'

type SendEmailArgs = {
	to: string
	subject: string
	html: string
	text: string
}

export const sendEmail = async (args: SendEmailArgs) => {
	try {
		const response = await axios.post(
			'https://34uuu2qlbx6acbkltcom32xoti0wrhnv.lambda-url.us-west-2.on.aws',
			args,
			{
				method: 'POST',
			}
		)

		console.log(response)
		return response
	} catch (error) {
		console.error(error)
		return error
	}
}
