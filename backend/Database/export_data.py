import pandas as pd

"""
IMPORTANT: Since we can't push the dataset to Github due to its size, download the dataset locally.
            Change the filepath to the location of the dataset on your machine. 
            e.g. file_path = "C:/Users/OWNER/Downloads/itineraries.csv/itineraries.csv"
"""

file_path = "C:/Users/OWNER/Documents/CECS 491/flights_sample.csv"  # Change this to your dataset path
df = pd.read_csv(file_path)


def extract_airports(df):
    # Combine both airport columns
    airports = pd.concat([df["startingAirport"], df["destinationAirport"]]).unique()

    # Convert to dataframe
    airports_df = pd.DataFrame(airports, columns=["airport"])

    # Save to file
    airports_df.to_csv("airports_list.csv", index=False)

    print("Saved airport list!")

def extract_airlines(df):
        # Split airline segments
    airlines = (
        df["segmentsAirlineName"]
        .dropna()
        .str.split("||", regex=False)
        .explode()
        .str.strip()
        .unique()
    )
    pd.DataFrame(airlines, columns=["airline"]).to_csv("airlines_list_all.csv", index=False)

    print("Airlines extracted:", len(airlines))

if __name__ == "__main__":
    #extract_airports(df)
    #extract_airlines(df)
    print()