# FlightSight

Members (5):
  * Alexandra Real Perez
  * Preston Huynh
  * Lesly Castellanos Ibanez
  * Zarya Amin
  * Jonell Felix Santiago

## Our Goal
Flight Sight is an application designed to help users make more informed decisions about their flight bookings. By utilizing previous flight data and demand patterns, our app produces valuable ticket recommendations adjusted to travel date, luggage size, and destination. This includes a user-friendly interface that makes data input/collection simple and efficient. The application will also include flight information that outlines an airline’s safety ratings and environmental impact.

## Demo
<img width="800" height="500" alt="Screenshot 2025-10-30 210759" src="https://github.com/user-attachments/assets/b0c692b5-2144-4fc7-8a91-aa2e1b60c52a" />
<img width="800" height="500" alt="Screenshot 2025-10-30 211225" src="https://github.com/user-attachments/assets/e18bdfd8-22b7-46e8-8a00-340aa4d8191d" />

## Navigation
In progress...

## Dataset
[Original Dataset](https://www.kaggle.com/datasets/dilwong/flightprices)
One-way flights found on Expedia between 2022-04-16 and 2022-10-05

Since the original dataset is too big to use for machine learning, we extracted a portion of it using extract_sample.py. The extracted dataset has 2 million rows which was used for the model. 
- Extracted dataset: flights_sample.csv
- Extracted dataset with added engineered features: flights_engineered.csv
Both datasets are still to big to be pushed into github so I included both on the .gitignore. The two dataset can be forund on the following google drive folder:
[Dataset used in the project](https://drive.google.com/drive/folders/1_baZXrMwvq_H7fsaeXSTsdx_Ltgb2uop)

### Source
OECD (2025), Population based on various sources (2024) – with major processing by Our World in Data
- Last updated: March 11, 2025
- Next expected update: March 2026
- Date range: 2013–2024
- Unit: kilograms 
