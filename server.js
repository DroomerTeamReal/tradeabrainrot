/*
Simple Java backend using built-in HttpServer + Gson for JSON.
Build/run with Maven (pom snippet below). The server saves to accounts.json in the working directory.
NOTE: This is a demo. Do NOT use in production without proper security (password hashing, authentication, input validation, rate-limiting, CSRF protection, TLS, etc.)
*/


import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpHandler;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;


import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.Executors;


public class Server {
static class Account {
String email;
String password; // plain text in this demo
String displayName;
List<String> blocked = new ArrayList<>();
List<Message> messages = new ArrayList<>();
}
static class Message { String from; String to; String message; long ts; }


static Map<String, Account> accounts = new HashMap<>();
static final File STORE = new File("accounts.json");
static final Gson gson = new Gson();


public static void main(String[] args) throws Exception {
int port = Integer.parseInt(System.getenv().getOrDefault("PORT","8000"));
loadStore();


HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
server.createContext("/api/register", new RegisterHandler());
server.createContext("/api/traders", new TradersHandler());
server.createContext("/api/accounts", new AccountsHandler());
server.createContext("/api/block", new BlockHandler());
server.createContext("/api/message", new MessageHandler());


server.setExecutor(Executors.newFixedThreadPool(8));
System.out.println("Server running on port " + port);
server.start();
}


static void loadStore(){
if(!STORE.exists()) return;
try(Reader r = new FileReader(STORE)){
List<Account> list = gson.fromJson(r, new TypeToken<List<Account>>(){}.getType());
if(list!=null) for(Account a: list) accounts.put(a.email.toLowerCase(), a);
System.out.println("Loaded " + accounts.size() + " accounts");
}catch(Exception e){ e.printStackTrace(); }
}
static synchronized void persist(){
try(Writer w = new FileWriter(STORE)){
gson.toJson(new ArrayList<>(accounts.values()), w);
}catch(Exception e){ e.printStackTrace(); }
}


static void addCors(HttpExchange ex){
Headers h = ex.getResponseHeaders();
h.add("Access-Control-Allow-Origin","*");
h.add("Access-Control-Allow-Methods","GET,POST,OPTIONS");
h.add("Access-Control-Allow-Headers","Content-Type"
