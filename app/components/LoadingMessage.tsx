import Image from "next/image";
import Spinner from "@/public/spinner.svg";

function LoadingMessage({ message }: { message: string }) {
  return (
    <>
      <Image src={Spinner} alt="" width={100} />
      <p className="text-white" data-testid="loadingMessage">
        {message}
      </p>
    </>
  );
}

export default LoadingMessage;
