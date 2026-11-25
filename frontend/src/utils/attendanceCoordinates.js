export async function attendanceCoordinates(required) {
  if (!required) return {};
  if (!navigator.geolocation) throw new Error('Campus location is required to mark attendance.');
  const position = await new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { maximumAge: 10000, timeout: 8000, enableHighAccuracy: true })
  );
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}
