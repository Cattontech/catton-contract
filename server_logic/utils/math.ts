// Function to shuffle an array in place (Fisher-Yates algorithm)
export function shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

export function parseBoolean(booleanString: string): boolean{
  if(booleanString.toLowerCase() == "true"){
    return true;
  }

  return false;
}  