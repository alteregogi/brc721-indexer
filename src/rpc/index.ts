import axios, { AxiosError } from "axios";

import { BitcoinRPCRes } from "./types";

const RPCPORT = process.env.RPCPORT!;
const USERNAME = process.env.RPCUSER!;
const RPCBINDIP = process.env.RPCBINDIP!;
const PASSWORD = process.env.RPCPASSWORD!;

export const bitcoinRPC = async (
  method: string,
  params: Array<any>
): Promise<BitcoinRPCRes<any>> => {
  return await axios({
    method: "POST",
    url: `http://${RPCBINDIP}:${RPCPORT}`,
    headers: { "content-type": "text/plain" },
    auth: { username: USERNAME, password: PASSWORD },
    data: { params, method, jsonrpc: "1.0", id: "curltext" },
  })
    .then((res) => res.data)
    .catch((err: AxiosError) => {
      console.log("RPC ERROR:", err.response);
      throw new Error(err.message);
    });
};
