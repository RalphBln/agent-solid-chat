import {useMemo, useCallback, useEffect, useState} from "react";

import { MainContainer, Sidebar, ConversationList, Conversation, Avatar, ChatContainer, ConversationHeader, MessageGroup, Message,MessageList, MessageInput, TypingIndicator } from "@chatscope/chat-ui-kit-react";

import {
    useChat,
    ChatMessage,
    MessageContentType,
    MessageDirection,
    MessageStatus
} from "@chatscope/use-chat";
import {MessageContent, TextContent } from "@chatscope/use-chat";
import { SolidChatUser } from "../SolidChatUser";
import EditableLabel from './EditableLabel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';

import "../country-mappings";
import { countryMappings } from "../country-mappings";

const counterSpeechStyle = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 800,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };

export const Chat = ({
    user,
    checkLocation = (location) => {},
    updateLocation,
    checkAge  = (age) => {},
    updateAge
}:{
    user: SolidChatUser,
    checkLocation?: (location: string) => void,
    updateLocation: (location: string) => void,
    checkAge?: (age: string) => void,
    updateAge: (age: string) => void
}) => {
    
    // Get all chat related values and methods from useChat hook 
    const {
        currentMessages, conversations, activeConversation, setActiveConversation,  sendMessage, getUser, currentMessage, setCurrentMessage,
        sendTyping, setCurrentUser
    } = useChat();
    
    useEffect( () => {
        setCurrentUser(user);
    },[user, setCurrentUser]);
    
    // Get current user data
    const [currentUserAvatar, currentUserName] = useMemo(() => {

        if (activeConversation) {
            const participant = activeConversation.participants.length > 0 ? activeConversation.participants[0] : undefined;

            if (participant) {
                const user = getUser(participant.id);
                if (user) {
                    return [<Avatar src={user.avatar} />, user.username]
                }
            }
        }

        return [undefined, undefined];

    }, [activeConversation, getUser]);

    const handleChange = (value:string) => {
        // Send typing indicator to the active conversation
        // You can call this method on each onChange event
        // because sendTyping method can throttle sending this event
        // So typing event will not be send to often to the server
        setCurrentMessage(value);
        if ( activeConversation ) {
            sendTyping({
                conversationId: activeConversation?.id,
                isTyping:true,
                userId: user.id,
                content: value, // Note! Most often you don't want to send what the user types, as this can violate his privacy!
                throttle: true
            });
        }
        
    }

    const [ counterSpeechVisible, setCounterSpeechVisible] = useState(false);
    
    const handleSend = (text:string) => {

        checkHateSpeech(text);

        const message = new ChatMessage({
            id: "", // Id will be generated by storage generator, so here you can pass an empty string
            content: text as unknown as MessageContent<TextContent>,
            contentType: MessageContentType.TextHtml,
            senderId: user.id,
            direction: MessageDirection.Outgoing,
            status: MessageStatus.Sent
        });
        
        if ( activeConversation ) {
            sendMessage({
                message,
                conversationId: activeConversation.id,
                senderId: user.id,
            });
        }

    };

    const [ nationalLawViolationMessage, setNationalLawViolationMessage] = useState("");
    const [ communityGuidelinesViolationMessage, setCommunityGuidelinesViolationMessage] = useState("");
    const [ counterSpeech, setCounterSpeech] = useState("");

    const checkHateSpeech = async (text:string) => {
        fetch(`http://localhost:${process.env.REACT_APP_PROXY_PORT}/detect-hate-speech`, {
            method: 'POST',
            body: JSON.stringify({
                text: text
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
            },
        })
         .then((response) => response.json())
         .then((data) => {
            console.log(data["holocaust_denial"]);
            console.log(data["level"]);
            console.log(data["result"]);

            const chatContext = activeConversation?.participants.find(participant => 
                ((getUser(participant.id)) as SolidChatUser).age < 18)
                === undefined ? "allAdults" : "hasMinors";

            const hol = data["holocaust_denial"] === true ? "hol_denial" : "";
            const user_age = user.age < 18 ? "minor" : "adult";

            console.log(`hate_speech_score: ${data["level"]},
                user_age: ${user_age},
                chat_context: ${chatContext},
                hol: ${hol},
                user_location: ${user.location.toLowerCase()}`);

            fetch(`http://localhost:${process.env.REACT_APP_PROXY_PORT}/legal-and-ethical-check?` + new URLSearchParams({
                hate_speech_score: data["level"],
                user_age: user_age,
                chat_context: chatContext,
                hol: hol,
                user_location: user.location.toLowerCase()
            }))
            .then((response) => response.json())
            .then((data) => {
                const response = data["response"];
                if (response === "safe")
                    return;

                const ethicalViolation = response["ethical_violation"];
                if (ethicalViolation !== undefined) {
                    const score = ethicalViolation["score"];
                    // todo we don't do anything with the score yet.
                    setCommunityGuidelinesViolationMessage((countryMappings[user.location] || countryMappings["USA"]).community_guidelines_violation);
                }
                const legalViolation = response["legal_violation"];
                if (legalViolation !== undefined) {
                    setNationalLawViolationMessage((countryMappings[user.location] || countryMappings["USA"]).national_law_violation);
                }

                fetch(`http://localhost:${process.env.REACT_APP_PROXY_PORT}/generate-counter-speech`, {
                    method: 'POST',
                    body: JSON.stringify({
                        language: (countryMappings[user.location] || countryMappings["USA"]).national_law_violation,
                        national_origin: (countryMappings[user.location] || countryMappings["USA"]).origin,
                        text: text
                    }),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                })
                .then((response) => response.json())
                .then((data) => {
                    setCounterSpeech(data["result"]);
                })
                .catch((err) => {
                    console.log(err.message);
                 });
                
                setCounterSpeechVisible(true);
            })
            .catch((err) => {
                console.log(err.message);
             });
         })
         .catch((err) => {
            console.log(err.message);
         });
    }

    const resetCounterSpeechPopup = () => {
        setCounterSpeechVisible(false);
        setNationalLawViolationMessage("");
        setCommunityGuidelinesViolationMessage("");
        setCounterSpeech("");
    };

    const getTypingIndicator = useCallback(
        () => {
            
                if (activeConversation) {

                    const typingUsers = activeConversation.typingUsers;

                    if (typingUsers.length > 0) {

                        const typingUserId = typingUsers.items[0].userId;

                        // Check if typing user participates in the conversation
                        if (activeConversation.participantExists(typingUserId)) {

                            const typingUser = getUser(typingUserId);

                            if (typingUser) {
                                return <TypingIndicator content={`${typingUser.username} is typing`} />
                            }

                        }

                    }

                }
                

            return undefined;

        }, [activeConversation, getUser],
    );
    
    return (<MainContainer responsive>
        <Sidebar position="left" scrollable>
            <ConversationHeader style={{backgroundColor:"#fff"}}>
                <Avatar src={user.avatar} />
                <ConversationHeader.Content>
                    {user.username}
                    <div className="cs-conversation__info">
                    <EditableLabel
                        initialValue={"" + user.age}
                        save={updateAge}
                        check={checkAge}
                    />,&nbsp;
                    <EditableLabel
                        initialValue={user.location}
                        save={updateLocation}
                        check={checkLocation}
                    />
                    </div>
                </ConversationHeader.Content>
            </ConversationHeader>
            <ConversationList>
                {conversations.map(c => {
                    // Helper for getting the data of the first participant
                    const [avatar, name] = (() => {

                        const participant = c.participants.length > 0 ? c.participants[0] : undefined;
                        
                        if (participant) {
                            const user = getUser(participant.id);
                            if (user) {

                                return [<Avatar src={user.avatar} />, user.username]

                            }
                        }

                        return [undefined, undefined]
                    })();

                    return <Conversation key={c.id}
                                  name={name}
                                //   info={c.draft ? `Draft: ${c.draft.replace(/<br>/g,"\n").replace(/&nbsp;/g, " ")}` : ``}
                                info={`${(getUser(c.participants[0].id) as SolidChatUser).age}, ${(getUser(c.participants[0].id) as SolidChatUser).location}`}
                                  active={activeConversation?.id === c.id}
                                  unreadCnt={c.unreadCounter}
                                  onClick={() => setActiveConversation(c.id)}>
                        {avatar}
                    </Conversation>
                })}
            </ConversationList>
        </Sidebar>
        
        <ChatContainer>
            {activeConversation && <ConversationHeader>
                {currentUserAvatar}
                <ConversationHeader.Content userName={currentUserName} />
            </ConversationHeader>}
            <MessageList typingIndicator={getTypingIndicator()}>
                {activeConversation && currentMessages.map( (g) => <MessageGroup key={g.id} direction={g.direction}>
                    <MessageGroup.Messages>
                        {g.messages.map((m:ChatMessage<MessageContentType>) => <Message key={m.id} model={{
                            type: "html",
                            payload: m.content,
                            direction: m.direction,
                            position: "normal"
                        }} />)}
                    </MessageGroup.Messages>
                </MessageGroup>)}
            </MessageList>
            <MessageInput value={currentMessage} onChange={handleChange} onSend={handleSend} disabled={!activeConversation} attachButton={false} placeholder="Type here..."/>
        </ChatContainer>
        <Modal
            open={counterSpeechVisible}
            onClose={resetCounterSpeechPopup}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box sx={counterSpeechStyle}>
            <Typography id="modal-modal-title" variant="h6" component="h2">
                { (countryMappings[user.location] || countryMappings.USA).hate_speech_title }
            </Typography>
            <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                {communityGuidelinesViolationMessage}
            </Typography>
            <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                {nationalLawViolationMessage}
            </Typography>
            <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                {counterSpeech}
            </Typography>
            </Box>
        </Modal>        
    </MainContainer>);
    
}