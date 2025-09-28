import { json } from '@sveltejs/kit';

export async function GET() {
	return json({ 
		message: 'Test API is working',
		status: 'ok'
	});
}

export async function POST({ request }) {
	console.log('=== TEST POST REQUEST RECEIVED ===');
	
	try {
		const body = await request.json();
		console.log('Test POST body received:', body);
		
		return json({ 
			message: 'Test POST successful',
			received: body
		});
	} catch (error) {
		console.error('Test POST error:', error);
		return json({ 
			error: 'Test POST failed',
			details: error.message
		}, { status: 400 });
	}
}
