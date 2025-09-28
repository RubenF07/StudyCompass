export async function load({ parent }) {
	const { studentId } = await parent();
	
	return {
		studentId
	};
}
