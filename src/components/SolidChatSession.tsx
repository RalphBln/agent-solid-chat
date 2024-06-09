import { Chat } from './Chat';
import { Presence, UserStatus } from "@chatscope/use-chat";
import { useState, useEffect } from "react";
import Creatable from 'react-select/creatable';
import { useSession, LoginButton, LogoutButton, CombinedDataProvider } from "@inrupt/solid-ui-react";
import { 
  getStringNoLocale,
  setStringNoLocale,
  getUrl,
  getSolidDataset,
  getThing,
  setThing,
  Thing,
  SolidDataset } from "@inrupt/solid-client";
import { FOAF, VCARD } from "@inrupt/lit-generated-vocab-common";
import { identityProviderOptions } from './solid-identityproviders';
import { SolidChatUser } from '../SolidChatUser';

export const SolidChatSession = () => {

    const { session } = useSession();
    const webId = session.info.webId!;

    const [idp, setIdp] = useState<({label:string, value:string}|null)>({ label: identityProviderOptions[0].label, value: identityProviderOptions[0].value });
    const [currentUrl, setCurrentUrl] = useState(window.location.href);
  
    useEffect(() => {
      setCurrentUrl(window.location.href);
    }, [setCurrentUrl]);
   
    const [ user, setUser ] = useState(new SolidChatUser ({
      id: webId,
      presence: new Presence({status: UserStatus.Available, description: ""}),
      firstName: "",
      lastName: "",
      username: "- retrieving user name -",
      email: "",
      avatar: "",
      bio: "",
      location: "",
      age: 0
    }));

    const [solidProfile, setSolidProfile] = useState<Thing>();
    const [dataset, setDataset] = useState<SolidDataset>();
    const [solidUserLoaded, setSolidUserLoaded] = useState(false);

    if (session.info.isLoggedIn) {
      if (!solidUserLoaded) {
        setSolidUserLoaded(true);
        console.log("##### Fetching user data from Solid");
        getSolidDataset(webId, { fetch: session.fetch } ).then((profileDataset) => {
          const profileThing = getThing(profileDataset, webId);
          setDataset(profileDataset);
          setSolidProfile(profileThing!);
          const firstName = getStringNoLocale(profileThing!, FOAF.givenName.iriAsString) as string;
          const username = firstName;
          const lastName = getStringNoLocale(profileThing!, FOAF.familyName.iriAsString) as string;
          const avatar = getUrl(profileThing!, VCARD.hasPhoto.iriAsString) as string;
          const location = getStringNoLocale(profileThing!, VCARD.hasCountryName.iriAsString) as string;
          const age = Number(getStringNoLocale(profileThing!, FOAF.age.iriAsString) as string);
          const loadedUser = new SolidChatUser({
            id: user.id,
            presence: user.presence,
            firstName: firstName,
            lastName: lastName,
            username: username,
            email: user.email,
            avatar: avatar,
            bio: user.bio,
            location: location,
            age: age
          });
          setUser(loadedUser);
        });
      }
    }

    const updateLocation = async (location: string) => {
      storeToSolidPod(setStringNoLocale(solidProfile!, VCARD.hasCountryName.iriAsString, location));
    };

    const  updateAge = async (age: string) => {
      storeToSolidPod(setStringNoLocale(solidProfile!, FOAF.age.iriAsString, age));
    };

    const storeToSolidPod = async (profile: Thing) => {
      setSolidProfile(profile);
      setThing(dataset!, profile)
    };

    return (
        <>
          <h1>Vecomp Chat</h1>
          {session.info.isLoggedIn ? (
            <CombinedDataProvider datasetUrl={webId} thingUrl={webId}>
            <Chat
              user={user}
              updateLocation={updateLocation}
              updateAge={updateAge}
            />
            <LogoutButton />
            </CombinedDataProvider>
        ) : (
          <>
          Please select your identity provider (idp) and log in to (one of) your Solid Pod(s):
              <Creatable
                options={identityProviderOptions}
                value={idp}
                defaultValue={{ label: identityProviderOptions[0].label, value: identityProviderOptions[0].value }}
                onChange={selection => setIdp(selection)} />
            <LoginButton
                authOptions={{ clientName: "Vecomp Chat" }}
                oidcIssuer={idp == null ? identityProviderOptions[0].value : idp.value}
                redirectUrl={currentUrl}
                onError={console.error}
            />
          </>
        )}
        </>
      );
}