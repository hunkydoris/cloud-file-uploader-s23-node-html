import {PrismaClient} from '@prisma/client'
import bcrypt from 'bcrypt'

const db = new PrismaClient()

async function seed() {
	await db.user.deleteMany()

	await db.user.create({
		data: {
			name: 'John',
			email: 'john@doe.com',
			password: await bcrypt.hash('password', 10),
		},
	})

	console.log(`Database has been seeded. 🌱`)
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await db.$disconnect()
	})
