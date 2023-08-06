import {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import {getSignedUrl} from '@aws-sdk/s3-request-presigner'
import config from '~/lib/env'

/**
 * Creates an S3 client.
 *
 * {@link https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started-nodejs.html}
 */
const s3Client = new S3Client({
	credentials: {
		accessKeyId: config.aws_access_key_id,
		secretAccessKey: config.aws_secret_access_key,
	},
	region: config.region,
})

interface S3SignedUrlOptions {
	bucket: string
	expiresIn: number
}

/**
 * Default options for the S3 Signed Url function
 */
const defaultS3SignedUrlOptions: S3SignedUrlOptions = {
	bucket: config.bucket_name,
	expiresIn: 60,
}

/**
 * Generates a signed URL for uploading an object to an S3 bucket.
 *
 * {@link https://docs.aws.amazon.com/AmazonS3/latest/userguide/example_s3_Scenario_PresignedUrl_section.html}
 */
export async function getS3SignedUrl(
	key: string,
	options: Partial<S3SignedUrlOptions> = defaultS3SignedUrlOptions
): Promise<string> {
	const {bucket, expiresIn} = {
		...defaultS3SignedUrlOptions,
		...options,
	}

	const signedUrl = await getSignedUrl(
		s3Client,
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
		}),
		{
			expiresIn: expiresIn,
		}
	)

	return signedUrl
}

/**
 * Deletes an object from an S3 bucket.
 *
 * {@link https://docs.aws.amazon.com/AmazonS3/latest/userguide/example_s3_DeleteObject_section.html}
 */
export function deleteS3Object({
	key,
	bucket = config.bucket_name,
}: {
	key: string
	bucket?: string
}) {
	return s3Client.send(
		new DeleteObjectCommand({
			Bucket: bucket,
			Key: key,
		})
	)
}
